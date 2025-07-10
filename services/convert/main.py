import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import datetime
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger("uvicorn.error")
logger.setLevel(logging.INFO)


@app.get("/healthz")
async def healthz():
    return {"message": "ok"}


class RequestModel(BaseModel):
    data: dict


class ResposeModel(BaseModel):
    message: str
    data: dict
    created_at: int


@app.post("/ips", response_model=ResposeModel)
async def convertion(body: RequestModel):
    data = body.data
    created_at = int(datetime.datetime.now(datetime.UTC).timestamp())
    return {"message": "ok", "data": data, "created_at": created_at}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        access_log=True,
        reload=True
    )