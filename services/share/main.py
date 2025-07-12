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


class CodeRequestModel(BaseModel):
    uuid: str


class CodeResposeModel(BaseModel):
    uuid: str
    created_at: int


@app.post("/", response_model=CodeRequestModel)
async def createRoom(body: CodeResposeModel):
    sharer_uuid = body.uuid
    created_at = int(datetime.datetime.now(datetime.UTC).timestamp())
    return {"message": "ok", "data": data, "created_at": created_at}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        access_log=True,
        reload=True
    )