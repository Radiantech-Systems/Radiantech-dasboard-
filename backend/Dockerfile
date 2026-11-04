FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Trust the verified Let's Encrypt Root YR cross-signed by ISRG Root X1.
COPY certs/root-yr-by-x1.crt /usr/local/share/ca-certificates/root-yr-by-x1.crt
RUN update-ca-certificates

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
