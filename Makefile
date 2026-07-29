# Latenite AI - Docker Makefile for Easy Commands
# Usage: make <command>

.PHONY: help build up down logs clean dev prod scale

# Default target
help:
	@echo "🐳 Latenite AI Docker Commands"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start development mode with hot reload"
	@echo "  make dev-logs     - View development logs"
	@echo ""
	@echo "Production:"
	@echo "  make build        - Build production image"
	@echo "  make up           - Start production (single instance)"
	@echo "  make prod         - Start production (3 instances)"
	@echo "  make scale N=5    - Scale to N instances"
	@echo ""
	@echo "Management:"
	@echo "  make logs         - View logs (all services)"
	@echo "  make status       - Show container status"
	@echo "  make restart      - Restart all services"
	@echo "  make down         - Stop all services"
	@echo "  make clean        - Stop and remove all data"
	@echo ""
	@echo "Utilities:"
	@echo "  make shell        - Access container shell"
	@echo "  make health       - Check health status"
	@echo "  make backup       - Backup session data"
	@echo ""

# Development
dev:
	@echo "🚀 Starting development mode..."
	docker-compose -f docker-compose.dev.yml up

dev-build:
	@echo "🔨 Building development image..."
	docker-compose -f docker-compose.dev.yml build

dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f

# Production
build:
	@echo "🔨 Building production image..."
	docker-compose build

up:
	@echo "🚀 Starting production (single instance)..."
	docker-compose up -d
	@echo "✅ Access: http://localhost:5000"

prod:
	@echo "🚀 Starting production (scaled to 3 instances)..."
	docker-compose -f docker-compose.prod.yml up -d --scale latenite-ai=3
	@echo "✅ Access: http://localhost:80"

scale:
	@echo "📈 Scaling to $(N) instances..."
	docker-compose -f docker-compose.prod.yml up -d --scale latenite-ai=$(N)

# Management
logs:
	docker-compose logs -f

logs-app:
	docker-compose logs -f latenite-ai

status:
	@echo "📊 Container Status:"
	@docker-compose ps

restart:
	@echo "🔄 Restarting services..."
	docker-compose restart

down:
	@echo "🛑 Stopping services..."
	docker-compose down

clean:
	@echo "🧹 Cleaning up everything..."
	docker-compose down -v
	docker system prune -f

# Utilities
shell:
	@echo "🐚 Accessing container shell..."
	docker exec -it latenite-ai sh

health:
	@echo "🏥 Health Check:"
	@curl -s http://localhost:5000/api/health | jq .

stats:
	@echo "📊 Resource Usage:"
	docker stats --no-stream

backup:
	@echo "💾 Backing up session data..."
	@docker run --rm \
		-v latenite-ai_session-data:/data \
		-v $$(pwd):/backup \
		alpine tar czf /backup/backup-$$(date +%Y%m%d-%H%M%S).tar.gz /data
	@echo "✅ Backup created: backup-$$(date +%Y%m%d-%H%M%S).tar.gz"

# Quick commands
install: build up

start: up

stop: down

rebuild: down build up

