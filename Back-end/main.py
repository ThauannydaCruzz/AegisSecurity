from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel, EmailStr
from typing import Optional
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from sqlalchemy import Column, Integer, String, Boolean, create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
import face_recognition
import numpy as np
import cv2

from fastapi.middleware.cors import CORSMiddleware

SECRET_KEY = "chave-secreta-aegis"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DATABASE_URL = "sqlite:///./users.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    country = Column(String)
    agree_to_terms = Column(Boolean, default=False)
    face_image_path = Column(String, nullable=True)

Base.metadata.create_all(bind=engine)

class UserCreate(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    password: str
    country: str
    agreeToTerms: bool

class Token(BaseModel):
    access_token: str
    token_type: str

class UserOut(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    country: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_password_hash(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_user(db, email: str):
    email = email.lower()
    return db.query(User).filter(User.email == email).first()

def authenticate_user(db, email: str, password: str):
    user = get_user(db, email)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

@app.post("/register", response_model=UserOut)
def register(user: UserCreate):
    db = SessionLocal()
    try:
        user_email = user.email.lower()
        db_user = get_user(db, user_email)
        if db_user:
            raise HTTPException(status_code=400, detail="Email já cadastrado")
        hashed_password = get_password_hash(user.password)
        db_user = User(
            first_name=user.firstName,
            last_name=user.lastName,
            email=user_email,
            hashed_password=hashed_password,
            country=user.country,
            agree_to_terms=user.agreeToTerms,
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return UserOut(
            firstName=db_user.first_name,
            lastName=db_user.last_name,
            email=db_user.email,
            country=db_user.country
        )
    finally:
        db.close()

@app.post("/login", response_model=Token)
def login(login_req: LoginRequest):
    db = SessionLocal()
    try:
        user = authenticate_user(db, login_req.email, login_req.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou senha incorretos",
                headers={"WWW-Authenticate": "Bearer"},
            )
        access_token = create_access_token(
            data={"sub": user.email},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        return {"access_token": access_token, "token_type": "bearer"}
    finally:
        db.close()

# ---- RECONHECIMENTO FACIAL ---- #
PASTA_ROSTOS = "rostos_cadastrados"
os.makedirs(PASTA_ROSTOS, exist_ok=True)

@app.post("/register_face")
async def register_face(email: str = Form(...), file: UploadFile = File(...)):
    db = SessionLocal()
    try:
        user = get_user(db, email.lower())
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        conteudo = await file.read()
        np_arr = np.frombuffer(conteudo, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        rgb_frame = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb_frame)
        if len(face_locations) != 1:
            raise HTTPException(status_code=400, detail="Envie uma imagem com 1 rosto visível")
        top, right, bottom, left = face_locations[0]
        rosto = img[top:bottom, left:right]
        caminho = os.path.join(PASTA_ROSTOS, f"{user.email}.jpg")
        cv2.imwrite(caminho, rosto)
        user.face_image_path = caminho
        db.commit()
        return {"success": True, "msg": "Rosto cadastrado"}
    finally:
        db.close()

@app.post("/login_face")
async def login_face(file: UploadFile = File(...)):
    db = SessionLocal()
    try:
        conteudo = await file.read()
        np_arr = np.frombuffer(conteudo, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        rgb_frame = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb_frame)
        if len(face_locations) != 1:
            raise HTTPException(status_code=400, detail="Envie uma imagem com 1 rosto visível")
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
        encoding = face_encodings[0]

        users = db.query(User).filter(User.face_image_path != None).all()
        rostos_conhecidos = []
        emails_conhecidos = []
        for u in users:
            if u.face_image_path and os.path.exists(u.face_image_path):
                imagem = face_recognition.load_image_file(u.face_image_path)
                encodings = face_recognition.face_encodings(imagem)
                if encodings:
                    rostos_conhecidos.append(encodings[0])
                    emails_conhecidos.append(u.email)
        if not rostos_conhecidos:
            raise HTTPException(status_code=401, detail="Nenhum rosto cadastrado no sistema")
        matches = face_recognition.compare_faces(rostos_conhecidos, encoding)
        face_distances = face_recognition.face_distance(rostos_conhecidos, encoding)
        best_match_index = np.argmin(face_distances)
        if matches[best_match_index]:
            user_email = emails_conhecidos[best_match_index]
            user = get_user(db, user_email)
            if not user:
                raise HTTPException(status_code=401, detail="Usuário não encontrado")
            access_token = create_access_token(
                data={"sub": user.email},
                expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            )
            return {"access_token": access_token, "token_type": "bearer", "email": user.email}
        else:
            raise HTTPException(status_code=401, detail="Rosto não reconhecido")
    finally:
        db.close()