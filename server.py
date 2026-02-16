from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import os
import json
from datetime import datetime
from typing import Optional, List

# Import existing logic
from app.service.auth import AuthInstance
from app.client.engsel import get_balance, get_tiering_info, get_profile, get_families
from app.client.ciam import get_otp, submit_otp, get_new_token
from app.menus.package import fetch_my_packages, get_packages_by_family
from app.service.bookmark import BookmarkInstance
from app.service.autobuy import AutoBuyInstance
import asyncio
import time

app = FastAPI(title="MYnyak Engsel Sunset API")

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    health = {
        "status": "OK",
        "timestamp": datetime.now().isoformat(),
        "kv_connected": AuthInstance.kv_client is not None,
        "token_count": len(AuthInstance.refresh_tokens),
        "has_active_user": AuthInstance.active_user is not None,
        "storage_mode": "KV" if AuthInstance.kv_client else "LOCAL_TMP"
    }
    return health

@app.get("/api/debug/connectivity")
def test_connectivity():
    import socket
    import requests
    
    results = {}
    
    # Test DNS for XL API
    target_host = "gede.ciam.xlaxiata.co.id"
    try:
        ip = socket.gethostbyname(target_host)
        results["dns_xl"] = {"status": "SUCCESS", "ip": ip}
    except Exception as e:
        results["dns_xl"] = {"status": "FAILED", "error": str(e)}
        
    # Test HTTP for XL API
    try:
        res = requests.get(f"https://{target_host}/", timeout=5)
        results["http_xl"] = {"status": "SUCCESS", "code": res.status_code}
    except Exception as e:
        results["http_xl"] = {"status": "FAILED", "error": str(e)}
        
    # Get Current IP
    try:
        ip_res = requests.get("https://api.ipify.org?format=json", timeout=5)
        results["server_ip"] = ip_res.json()["ip"]
    except:
        results["server_ip"] = "unknown"
        
    return results

@app.get("/api/profile")
def get_active_profile():
    active_user = AuthInstance.get_active_user()
    if not active_user:
        raise HTTPException(status_code=401, detail="No active user. Please login.")
    
    try:
        balance = get_balance(AuthInstance.api_key, active_user["tokens"]["id_token"])
        
        point_info = "Points: N/A | Tier: N/A"
        if active_user["subscription_type"] == "PREPAID":
            tiering_data = get_tiering_info(AuthInstance.api_key, active_user["tokens"])
            tier = tiering_data.get("tier", 0)
            current_point = tiering_data.get("current_point", 0)
            point_info = f"Points: {current_point} | Tier: {tier}"
            
        return {
            "number": active_user["number"],
            "subscriber_id": active_user["subscriber_id"],
            "subscription_type": active_user["subscription_type"],
            "balance": balance.get("remaining") if balance else 0,
            "balance_expired_at": balance.get("expired_at") if balance else 0,
            "point_info": point_info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/auth/accounts")
def get_accounts():
    return AuthInstance.refresh_tokens

@app.post("/api/auth/switch")
def switch_account(number: int = Body(..., embed=True)):
    success = AuthInstance.set_active_user(number)
    if success == False: # set_active_user returns None/False on failure
         raise HTTPException(status_code=400, detail="Failed to switch account")
    return {"message": f"Switched to {number}"}

@app.post("/api/auth/otp/request")
def request_otp(payload: dict = Body(...)):
    msisdn = payload.get("msisdn")
    if not msisdn:
        raise HTTPException(status_code=400, detail="MSISDN is required")
    
    # Ensure it starts with 628
    if msisdn.startswith("08"):
        msisdn = "628" + msisdn[2:]
    elif msisdn.startswith("8"):
        msisdn = "628" + msisdn[1:]
    
    res = get_otp(msisdn)
    if not res:
        raise HTTPException(status_code=400, detail="Failed to request OTP. Please check your number.")
    
    return {"status": "SUCCESS", "message": "OTP sent", "subscriber_id": res}

@app.post("/api/auth/otp/verify")
def verify_otp(payload: dict = Body(...)):
    msisdn = payload.get("msisdn")
    otp = payload.get("otp")
    
    if not msisdn or not otp:
        raise HTTPException(status_code=400, detail="MSISDN and OTP are required")

    # Ensure it starts with 628
    if msisdn.startswith("08"):
        msisdn = "628" + msisdn[2:]
    elif msisdn.startswith("8"):
        msisdn = "628" + msisdn[1:]

    tokens = submit_otp(AuthInstance.api_key, "SMS", msisdn, otp)
    if not tokens or "refresh_token" not in tokens:
        raise HTTPException(status_code=400, detail="Invalid OTP or verification failed")
    
    # Save the new account
    AuthInstance.add_refresh_token(int(msisdn), tokens["refresh_token"])
    
    return {"status": "SUCCESS", "message": "Login successful"}

@app.get("/api/packages/my")
def get_my_packages():
    active_user = AuthInstance.get_active_user()
    if not active_user:
        raise HTTPException(status_code=401, detail="No active user")
    
    from app.client.engsel import send_api_request
    from app.menus.util import format_quota_byte
    
    path = "api/v8/packages/quota-details"
    payload = {
        "is_enterprise": False,
        "lang": "en",
        "family_member_id": ""
    }
    
    res = send_api_request(
        AuthInstance.api_key,
        path,
        payload,
        active_user["tokens"]["id_token"]
    )
    
    if res and res.get("status") == "SUCCESS":
        # Format benefits like in CLI for frontend
        quotas = res.get("data", {}).get("quotas", [])
        for quota in quotas:
            benefits = quota.get("benefits", [])
            for b in benefits:
                data_type = b.get("data_type", "")
                remaining = b.get("remaining", 0)
                total = b.get("total", 0)
                
                if data_type == "DATA":
                    b["remaining_str"] = format_quota_byte(remaining)
                    b["total_str"] = format_quota_byte(total)
                elif data_type == "VOICE":
                    b["remaining_str"] = f"{remaining/60:.1f}m"
                    b["total_str"] = f"{total/60:.1f}m"
                else:
                    b["remaining_str"] = str(remaining)
                    b["total_str"] = str(total)
                    
    return res

@app.get("/api/packages/family/{family_code}")
def get_family_packages(family_code: str):
    active_user = AuthInstance.get_active_user()
    if not active_user:
        raise HTTPException(status_code=401, detail="No active user")
        
    from app.client.engsel import get_family
    res = get_family(AuthInstance.api_key, active_user["tokens"], family_code)
    if not res:
        raise HTTPException(status_code=404, detail="Family not found")
    return {"status": "SUCCESS", "data": res}

@app.get("/api/packages/detail/{family_code}/{variant_code}/{option_order}")
def get_package_detail_api(family_code: str, variant_code: str, option_order: int):
    active_user = AuthInstance.get_active_user()
    if not active_user:
        raise HTTPException(status_code=401, detail="No active user")
    
    api_key = AuthInstance.api_key
    tokens = AuthInstance.get_active_tokens()
    
    from app.client.engsel import get_package_details
    from app.menus.util import format_quota_byte
    try:
        res = get_package_details(
            api_key,
            tokens,
            family_code,
            variant_code,
            option_order
        )
        if not res:
            raise HTTPException(status_code=404, detail="Package detail not found")
        
        # Inject option_order for the frontend to use in purchase
        res["package_option"]["order"] = option_order
        
        # Format benefits like CLI
        benefits = res.get("package_option", {}).get("benefits", [])
        if benefits:
            for b in benefits:
                if b.get("data_type") == "DATA" and b.get("total", 0) > 0:
                    b["quota_string"] = format_quota_byte(b["total"])
                elif b.get("data_type") == "VOICE" and b.get("total", 0) > 0:
                    b["quota_string"] = f"{b['total']/60:.0f} menit"
                elif b.get("data_type") == "TEXT" and b.get("total", 0) > 0:
                    b["quota_string"] = f"{b['total']} SMS"
                else:
                    b["quota_string"] = str(b.get("total", ""))

        return {"status": "SUCCESS", "data": res}
    except Exception as e:
        print(f"[Detail Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/packages/purchase/family")
def purchase_package(payload: dict = Body(...)):
    family_code = payload.get("family_code")
    option_order = payload.get("option_order")
    method = payload.get("method", "pulsa") # Default to pulsa
    
    if family_code is None or option_order is None:
        raise HTTPException(status_code=400, detail=f"Missing family_code ({family_code}) or option_order ({option_order})")
    
    active_user = AuthInstance.get_active_user()
    if not active_user:
        raise HTTPException(status_code=401, detail="No active user")
    
    api_key = AuthInstance.api_key
    tokens = AuthInstance.get_active_tokens()
    
    from app.client.engsel import get_package_details, get_package
    from app.client.purchase.balance import settlement_balance
    from app.client.purchase.qris import settlement_qris, get_qris_code
    from app.service.decoy import DecoyInstance
    from app.type_dict import PaymentItem
    from random import randint

    try:
        # Get main package detail
        target_package_detail = get_package_details(api_key, tokens, family_code, "", option_order) # Note: variant code empty to auto-find
        if not target_package_detail:
            raise HTTPException(status_code=404, detail=f"Package not found for order {option_order}")

        main_price = target_package_detail["package_option"]["price"]
        payment_items = [
            PaymentItem(
                item_code=target_package_detail["package_option"]["package_option_code"],
                product_type="",
                item_price=main_price,
                item_name=target_package_detail["package_option"]["name"],
                tax=0,
                token_confirmation=target_package_detail["token_confirmation"],
            )
        ]

        payment_for = target_package_detail["package_family"].get("payment_for", "SHARE_PACKAGE") or "SHARE_PACKAGE"
        if method == "pulsa_decoy_v2":
            payment_for = "🤫"

        # Handle Decoy
        if "decoy" in method:
            decoy_type = "balance" if "pulsa" in method else "qris"
            if "qris0" in method: decoy_type = "qris0"
            
            decoy_info = DecoyInstance.get_decoy(decoy_type)
            if not decoy_info:
                raise HTTPException(status_code=500, detail="Failed to fetch decoy package")
            
            decoy_package = get_package(api_key, tokens, decoy_info["option_code"])
            payment_items.append(PaymentItem(
                item_code=decoy_package["package_option"]["package_option_code"],
                product_type="",
                item_price=decoy_package["package_option"]["price"],
                item_name=decoy_package["package_option"]["name"],
                tax=0,
                token_confirmation=decoy_package["token_confirmation"],
            ))
            main_price += decoy_package["package_option"]["price"]

        # Execution
        res = None
        if "pulsa" in method:
            res = settlement_balance(
                api_key, tokens, payment_items, payment_for, False,
                overwrite_amount=main_price,
                token_confirmation_idx=1 if method == "pulsa_decoy_v2" else 0
            )
            # Handle amount adjustment
            if res and res.get("status") != "SUCCESS" and "Bizz-err.Amount.Total" in res.get("message", ""):
                try:
                    valid_amount = int(res["message"].split("=")[1].strip())
                    res = settlement_balance(
                        api_key, tokens, payment_items, payment_for, False,
                        overwrite_amount=valid_amount,
                        token_confirmation_idx=1 if method == "pulsa_decoy_v2" else 0
                    )
                except: pass
        
        elif "qris" in method:
            transaction_id = settlement_qris(
                api_key, tokens, payment_items, "SHARE_PACKAGE", False,
                overwrite_amount=main_price,
                token_confirmation_idx=1 if "decoy" in method else 0
            )
            if transaction_id:
                qris_code = get_qris_code(api_key, tokens, transaction_id)
                return {"status": "SUCCESS", "message": "Siap bayar", "qris_code": qris_code}
            else:
                return {"status": "FAILED", "message": "Gagal membuat QRIS"}
        
        elif "wallet" in method:
            # method will be like "wallet_dana", "wallet_ovo", etc.
            wallet_type = method.split("_")[1].upper() # DANA, OVO, GOPAY, SHOPEEPAY
            wallet_number = payload.get("wallet_number", "")
            
            from app.client.purchase.ewallet import settlement_multipayment
            res = settlement_multipayment(
                api_key, tokens, payment_items, wallet_number, wallet_type, 
                payment_for, False, overwrite_amount=main_price
            )
            return res

        return res
    except Exception as e:
        print(f"[Purchase Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/bookmarks/family")
def get_family_bookmarks():
    return BookmarkInstance.get_family_bookmarks()

@app.post("/api/bookmarks/family")
def update_family_bookmarks(payload: dict = Body(...)):
    code = payload.get("code")
    name = payload.get("name")
    action = payload.get("action", "update") # update or delete
    
    if not code:
        raise HTTPException(status_code=400, detail="Code is required")
        
    if action == "delete":
        bookmarks = BookmarkInstance.get_family_bookmarks()
        new_bookmarks = [b for b in bookmarks if b["code"] != code]
        BookmarkInstance.set_family_bookmarks(new_bookmarks)
    else:
        if not name:
            name = code # Fallback
        BookmarkInstance.update_family_bookmark(code, name)
        
    return {"status": "SUCCESS", "data": BookmarkInstance.get_family_bookmarks()}

@app.get("/api/autobuy/configs")
def get_autobuy_configs():
    return {"status": "SUCCESS", "data": AutoBuyInstance.get_data()}

@app.post("/api/autobuy/configs")
def update_autobuy_config(config: dict = Body(...)):
    success = AutoBuyInstance.update_config(config)
    if not success:
        return {"status": "ERROR", "message": "Gagal menyimpan ke Redis/KV"}
    return {"status": "SUCCESS", "data": AutoBuyInstance.get_data()}

@app.post("/api/autobuy/interval")
def set_autobuy_interval(data: dict = Body(...)):
    minutes = data.get("minutes", 5)
    success = AutoBuyInstance.set_interval(minutes)
    if not success:
        return {"status": "ERROR", "message": "Gagal menyimpan ke Redis/KV"}
    return {"status": "SUCCESS", "data": AutoBuyInstance.get_data()}

@app.delete("/api/autobuy/configs/{config_id}")
def delete_autobuy_config(config_id: str):
    success = AutoBuyInstance.delete_config(config_id)
    if not success:
        return {"status": "ERROR", "message": "Gagal menyimpan ke Redis/KV"}
    return {"status": "SUCCESS", "data": AutoBuyInstance.get_data()}

@app.delete("/api/autobuy/logs")
def clear_autobuy_logs():
    return {"status": "SUCCESS", "data": AutoBuyInstance.clear_logs_and_get_data()}

@app.post("/api/autobuy/trigger")
async def trigger_autobuy():
    res = await AutoBuyInstance.run_check()
    return res

async def autobuy_task():
    print("[Task] AutoBuy background process started.")
    while True:
        try:
            # Refresh data from KV to sync with other instances
            AutoBuyInstance.load_data()
            
            wait_min = AutoBuyInstance.interval
            now = datetime.now().strftime("%H:%M:%S")
            print(f"[{now}][Task] Running AutoBuy check... (Next in {wait_min}m)")
            await AutoBuyInstance.run_check()
        except Exception as e:
            print(f"[AutoBuy Task Error] {e}")
            try:
                AutoBuyInstance.log_event("ERROR", f"Task Error: {str(e)}")
            except: pass
        
        await asyncio.sleep(AutoBuyInstance.interval * 60)

@app.on_event("startup")
async def startup_event():
    # Start background task
    asyncio.create_task(autobuy_task())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
