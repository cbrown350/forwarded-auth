<p align="center">
  <a href="" rel="noopener">
 <img height=300px src="readme.excalidraw.png" alt="Project logo"></a>
</p>

<h3 align="center">forwarded-auth</h3>

<div align="center">

</div>

---

<p align="center"> Auth middleware to which forwarded auth requests can be sent for Traefik.
    <br> 
</p>

### About

Once running, it works for any Docker container added at any time that is proxied via Traefik by only setting a few labels. The service in the container is protected via a cookie, jwt token in as a query parameter, a username/password set up through the included admin panel or a passphrase query parameter set as a forwarded-auth container env var.

### Examples
#### Passphrase
GET https://<service_name>?pf=<passphrase>
#### Username/Password
GET https://<service_name>?u=<username>&p=<password>
#### JWT Token
GET https://<service_name>?t=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImNicm93biIsInJlbW90ZUlwIjoiMTcyLjE4LjAuMSIsImlhdCI6MTcyMTM1MjM2NSwiZXhwIjoxNzIxNzg0MzY1fQ.haUQ11ecDEdbeKnESr5iUCL4S2zXpoxhOAf0mqpJ_z4
#### Cookie
GET https://<service_name>
cookie: forwardAuth=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImNicm93biIsInJlbW90ZUlwIjoiMTcyLjE4LjAuMSIsImlhdCI6MTcyMTM1MjM2NSwiZXhwIjoxNzIxNzg0MzY1fQ.haUQ11ecDEdbeKnESr5iUCL4S2zXpoxhOAf0mqpJ_z4

After any successful authentication, the forwarded-auth service will set a cookie with the JWT token, so once you authenticate initially through a static url, subsequent requests will be authenticated automatically.

### Prerequisites

This works as a container for Traefik. You must have Traefik running as a container proxy/loadbalancer in Docker or Kubernetes.

### Using

1. Clone the repo: `git clone https://github.com/username_0/forwarded-auth.git`
2. Copy the `sample.env` file to `.env` and fill in the values: `cp sample.env .env`
3. Add appropriate labels to your Traefik container and restart it (see [Settings](#settings) below)
4. Add appropriate labels to your service containers (see [Settings](#settings) below)
5. Start your forwarded-auth and service containers


To run the full example, including a dummy Nginx service, Traefik and forwarded-auth:
1. Copy the `sample.env` file to `.env` and fill in the values
2. Run `./password-hasher -p test_passphrase` to generate a passphrase hash
3. Set `PASSPHRASE_HASH` in the `.env` file to the output of the previous command
4. Set `ACME_TEST_DOMAIN` in the `.env` file to the domain you want to use for your service
5. Set passwords for `ADMIN_PASSWORD` and `JWT_SECRET` in the `.env` file
6. Run `docker-compose up -d` in the `.devcontainer/` folder
7. Run `curl http://<ACME_TEST_DOMAIN>?pf=test_passphrase` (access granted)
8. Run `curl http://<ACME_TEST_DOMAIN>` (access denied)

You can access the admin page for adding users/passwords by going to `http://localhost:9900/settings` and entering username `admin` and password `<ADMIN_PASSWORD>` set in the `.env` file.

### Settings

| ENV Var                                     | Default                                                       | Description                                                                                                                                                                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LOG_LEVEL`                               | `info`                                                      | Log message level:`info`, `debug`, `error`                                                                                                                                                                                                |
| `SERVER_IP`                               | `0.0.0.0`                                                   | IP that server runs on inside container; usually doesn't need to change                                                                                                                                                                         |
| `SERVER_PORT`                             | `8000`                                                      | Port that server runs on inside container; usually doesn't need to change                                                                                                                                                                       |
| `ADMIN_PASSWORD`                          | N/A                                                           | Password for admin panel for<br />username/password credentials                                                                                                                                                                                 |
| `ALLOW_IP_NO_CREDENTIALS`                 | `false`                                                     | Enable or disable service access without authorization from clients from IPs/subnets in `ALLOW_IP_NO_CREDENTIALS_SUBNETS`                                                                                                                     |
| `ALLOW_IP_NO_CREDENTIALS_SUBNETS`         | `172.24.235.218/20,192.168.0.0/21`                          | IPs from which a client can access the service without any type of authentication                                                                                                                                                               |
| `ALLOW_IP_NO_CREDENTIALS_TRUSTED_HEADERS` | `cf-connecting-ip`                                          | Header names that can supply a trusted no-credentials client IP address (`cf-connecting-ip,X-Real-Ip,X-Forwarded-For`)                                                                                                                        |
| `TRUSTED_HEADER_SOURCE_IPS`               | `173.245.48.0/20,103.21.244.0/22...` (see sample.env) | Trusted IPs from which forwarded headers (x-real-ip, etc.) can be sent                                                                                                                                                                          |
| `JWT_SECRET`                              | N/A                                                           | Passsphrase used to encrypt jwt tokens used in query parameter `t=` and the auth cookie; must be set                                                                                                                                          |
| `PASSPHRASE_HASH`                         | N/A                                                           | Hash of the passphrase that can be used for access to services in query parameter `pf=`                                                                                                                                                       |
| `COOKIE_NAME`                             | forwardAuth                                                   | Name of the cookie used to hold the jwt token                                                                                                                                                                                                   |
| `COOKIE_TTL`                              | `1d`                                                        | Time to live for the jwt and cookie, ie., the expiration time (ex.,`1h`, `5m`)                                                                                                                                                              |
| `DEFAULT_REDIRECT_ON_AUTH_FAIL_URL`       | `https://google.com`                                        | Default URL to which failed or missing authentication requests are redirected; The specific URL for each service container is set on the query parameter `X-Redirect-On-Auth-Fail-URL=` for the forward auth request set on the Traefik label |

A full configuration example is set out between the two `docker-compose.yaml` files in the root and `.devcontainer/` folders (`dummy_site` is the protected service).

| URL query parameters for auth requests from Traefik (set on the url in the Traefik service label `forwardauth.address`)                                                                                                 | Description                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `cookie_domain`                                     | Domain set on the auth cookie; may be specific to exact domain or on the root domain (settings are lax) |
| `X-Redirect-On-Auth-Fail-URL`                                     | URL to which failed requests are redirected for the service |

See the full [forwardauth Traefik documentation](https://doc.traefik.io/traefik/middlewares/http/forwardauth/) for the related labels: `https://doc.traefik.io/traefik/middlewares/http/forwardauth/`

| Labels Set on Service Container                                                                                                 | Description                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `traefik.http.middlewares.<middleware-name>.forwardauth.address=<path to auth container>`                                     | Address Traefik uses to authorize requests and uses query parameters described above; should point to instance of this container (see `.devcontainer/docker-compose.yaml`) |
| `traefik.http.middlewares.<middleware-name>.forwardauth.addAuthCookiesToResponse=${COOKIE_NAME:-forwardAuth}`                 | Name for cookie set by forwarded-auth (see `.devcontainer/docker-compose.yaml`)                                                  |
| `traefik.http.middlewares.<middleware-name>.forwardauth.authRequestHeaders=cookie,${ALLOW_IP_NO_CREDENTIALS_TRUSTED_HEADERS}` | List of headers that Traefik forwards to the forwarded-auth request (see `.devcontainer/docker-compose.yaml`)                    |

| Labels Set on Traefik Container                                                         | Description                                                                        |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `--entrypoints.<entrypoint>.forwardedHeaders.trustedIPs=${TRUSTED_HEADER_SOURCE_IPS}` | Set trusted forwarded headers from IPs (see `.devcontainer/docker-compose.yaml`) |

### Notes

1. When running as a devcontainer in VSCode for development, you may may need to toggle off and on debug auto attach and restart terminal if getting `booloader.js not found error` (setting "debug.javascript.autoAttachFilter": "smart")