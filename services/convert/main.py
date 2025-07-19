from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import datetime
from pydantic import BaseModel

app = FastAPI(
    root_path="/api/v1/convert",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthzResposeModel(BaseModel):
    message: str


@app.get("/healthz", response_model=HealthzResposeModel)
async def healthz():
    return {"message": "ok"}


class IPSRequestModel(BaseModel):
    data: dict


class IPSResposeModel(BaseModel):
    message: str
    data: dict
    createdAt: int


@app.post("/ips", response_model=IPSResposeModel)
async def convertion(body: IPSRequestModel):
    data = body.data
    created_at = int(datetime.datetime.now(datetime.UTC).timestamp())
    return {"message": "ok", "data": data, "createdAt": created_at}
