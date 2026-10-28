# syntax=docker/dockerfile:1
# Daivika API (Laravel 12, PHP 8.3, Apache). Listens on port 8000.
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-progress --no-scripts --prefer-dist --optimize-autoloader --ignore-platform-reqs

FROM php:8.3-apache

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev libpng-dev libjpeg62-turbo-dev libwebp-dev libfreetype6-dev libavif-dev libzip-dev libicu-dev \
    && docker-php-ext-configure gd --with-jpeg --with-webp --with-freetype --with-avif \
    && docker-php-ext-install -j"$(nproc)" pdo_pgsql pgsql gd zip intl bcmath exif opcache \
    && apt-get purge -y --auto-remove \
    && rm -rf /var/lib/apt/lists/*

# Apache: serve Laravel's public/ folder on port 8000, honour its .htaccess
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && sed -ri 's!Listen 80!Listen 8000!' /etc/apache2/ports.conf \
    && sed -ri 's!<VirtualHost \*:80>!<VirtualHost *:8000>!' /etc/apache2/sites-available/000-default.conf \
    && printf '<Directory /var/www/html/public>\n    AllowOverride All\n    Require all granted\n</Directory>\nServerTokens Prod\nServerSignature Off\n' > /etc/apache2/conf-available/daivika.conf \
    && a2enconf daivika && a2enmod rewrite headers

# PHP limits for image uploads (15 MB per image) and production settings
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
    && printf 'upload_max_filesize=20M\npost_max_size=60M\nmemory_limit=512M\nmax_execution_time=120\nexpose_php=Off\nopcache.validate_timestamps=0\nopcache.memory_consumption=128\n' > "$PHP_INI_DIR/conf.d/daivika.ini"

WORKDIR /var/www/html
COPY --from=vendor /app/vendor ./vendor
COPY . .
RUN mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs storage/app/image-cache bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod +x docker/entrypoint.sh

ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr \
    CACHE_STORE=file \
    SESSION_DRIVER=array \
    QUEUE_CONNECTION=sync

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s CMD php -r 'exit(@file_get_contents("http://127.0.0.1:8000/api/health") === false ? 1 : 0);'
ENTRYPOINT ["docker/entrypoint.sh"]
CMD ["apache2-foreground"]
