#!/bin/bash

apt-get update \
    && apt-get install -y \
      build-essential \
      wget \
      curl \
      git \
      gh \
      jq \
      less \
      nano \
      nmap \
      man \
      iputils-ping \
      bash-completion \
      locales \
      net-tools \
      watch \
    && rm -rf /var/lib/apt/lists/*

locale-gen en_US.UTF-8    

# Fix apt completion in Docker   
cat <<EOF >> /etc/apt/apt.conf.d/docker-clean

# Fix apt completion in Docker
DPkg::Post-Invoke { "rm -f /var/cache/apt/archives/*.deb /var/cache/apt/archives/partial/*.deb /var/cache/apt/*.bin || true"; };
APT::Update::Post-Invoke { "rm -f /var/cache/apt/archives/*.deb /var/cache/apt/archives/partial/*.deb /var/cache/apt/*.bin || true"; };
Dir::Cache::pkgcache "/var/cache/apt/pkgcache.bin"; Dir::Cache::srcpkgcache "/var/cache/apt/srcpkgcache.bin";
EOF

# Enable bash completion for all users
cat <<EOF >> /etc/bash.bashrc
if ! shopt -oq posix; then
 if [ -f /usr/share/bash-completion/bash_completion ]; then
   . /usr/share/bash-completion/bash_completion
 elif [ -f /etc/bash_completion ]; then
   . /etc/bash_completion
 fi
fi
EOF

git config --global --add safe.directory /app

cd /app && rm -rf node_modules && npm i --include=dev
