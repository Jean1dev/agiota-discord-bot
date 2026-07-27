SHELL := /bin/bash

NPM ?= npm
NODE ?= node
DOCKER_COMPOSE ?= docker compose

.DEFAULT_GOAL := help

.PHONY: help install build test test-oauth check dev start local oauth-url services-up services-down services-logs

help: ## Lista os comandos disponiveis
	@awk 'BEGIN {FS = ":.*##"; printf "Comandos disponiveis:\n"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  make %-16s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Instala as dependencias
	$(NPM) install

build: ## Compila o TypeScript para dist/
	$(NPM) run build

test: ## Roda todos os testes
	$(NPM) test

test-oauth: ## Roda apenas os testes do Google OAuth
	$(NPM) test -- google-Oauth

check: build test-oauth ## Validacao rapida antes de deploy

dev: ## Inicia o bot com nodemon usando o .env local
	$(NPM) run dev

start: build ## Compila e inicia o bot local
	$(NPM) start

local: services-up build ## Sobe Mongo/Rabbit e inicia o bot local
	$(NPM) start

oauth-url: build ## Imprime a URL OAuth do YouTube gerada pelo codigo local
	$(NODE) -e "require('dotenv').config(); const svc = require('./dist/services/youtube/YoutubeRssService'); console.log(svc.getAuthUrl())"

services-up: ## Sobe MongoDB e RabbitMQ locais
	$(DOCKER_COMPOSE) up -d mongodb rabbit

services-down: ## Para os servicos locais
	$(DOCKER_COMPOSE) down

services-logs: ## Acompanha logs de MongoDB e RabbitMQ
	$(DOCKER_COMPOSE) logs -f mongodb rabbit
