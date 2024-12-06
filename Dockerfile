FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV LANGUAGE en_US:en
ENV LANG en_US.UTF-8

# Set work directory
WORKDIR /src

# Update and install system-level dependencies
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev


# Install application-level dependencies
COPY requirements.txt /src/
RUN pip install uv
RUN uv pip sync requirements.txt --system

# Copy project files over to image
COPY . /src/

# Expose 8000 port in container for Django use
EXPOSE 8000
