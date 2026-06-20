FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements-dev.txt requirements-phase00.txt ./
COPY services/api/requirements.txt services/api/requirements.txt
COPY services/worker/requirements.txt services/worker/requirements.txt
RUN python -m pip install --upgrade pip \
  && python -m pip install -r requirements-dev.txt

COPY services services
COPY packages packages
COPY connectors connectors
COPY database database
COPY presets presets
COPY schemas schemas
COPY tools tools

WORKDIR /app/services/api
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
