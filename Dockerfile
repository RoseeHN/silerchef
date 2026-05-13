# Reproducible production image (Railway "Build image" / any Docker host).
# Runtime matches Procfile: PHP built-in server + router.php — Node is not required in prod.
FROM php:8.2-cli-bookworm

# Headers for ext-pgsql / ext-pdo_pgsql (libpq) and SQLite; unzip for Composer archives.
RUN set -eux; \
  apt-get update; \
  apt-get install -y --no-install-recommends \
    libpq-dev \
    libsqlite3-dev \
    unzip; \
  docker-php-ext-install -j"$(nproc)" \
    pdo_pgsql \
    pgsql \
    pdo_sqlite \
    sqlite3; \
  apt-get clean; \
  rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY composer.json ./
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-ansi

COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-lc", "php -S 0.0.0.0:${PORT:-3000} router.php"]
