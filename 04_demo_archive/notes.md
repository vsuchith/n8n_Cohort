# Notes — the `docker run` command for n8n, explained

Reference command:

```bash
docker run -d --name n8n --rm -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
```

## Anatomy

```
docker run -d --name n8n --rm -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
│          │   │          │   │              │                         │
│          │   │          │   │              │                         └── ① The image to run
│          │   │          │   │              └── ⑤ Mount a host folder into the container
│          │   │          │   └── ④ Map a host port to a container port
│          │   │          └── ③ Auto-delete the container when it stops
│          │   └── ② Name the running container "n8n"
│          └── ⑥ Run in detached / background mode
└── Docker's "start a new container from an image" subcommand
```

---

## ① `n8nio/n8n` — the image

- Docker Hub image. `n8nio` is the publisher (the n8n company), `n8n` is the image name.
- No `:tag` specified, so Docker uses `:latest` by default. Equivalent to `n8nio/n8n:latest`.
- First run downloads ~500 MB. Subsequent runs use the local cache.

## ② `--name n8n` — human name for the container

- Without this, Docker picks a random name like `amazing_bohr`.
- With `--name n8n`, you refer to it by name: `docker stop n8n`, `docker logs n8n`, `docker exec -it n8n sh`.
- Must be unique — running this command twice fails with "container name already in use".

## ③ `--rm` — auto-delete on stop

- When the container stops (crash, `docker stop`, system reboot), Docker **removes** it.
- **Pro**: no "stopped containers" pile up in `docker ps -a`; clean system.
- **Con**: no post-mortem. If n8n crashes, `docker logs n8n` fails — container is gone.
- For a one-off demo: fine. For debugging / multi-student classroom: painful. That's why `PREREQS.md` drops it.

## ④ `-p 5678:5678` — port mapping

- Format: `-p HOST_PORT:CONTAINER_PORT`.
- Inside the container, n8n listens on port 5678 (hardcoded in the image).
- This maps host port 5678 → container port 5678, so `http://localhost:5678` from your browser reaches the n8n server inside the container.
- If another process uses 5678 on your host, change the **left** side only: `-p 5679:5678` → browse to `http://localhost:5679`. But the OAuth redirect URI must then match the host side (`5679`).

## ⑤ `-v ~/.n8n:/home/node/.n8n` — volume (bind mount)

- Format: `-v HOST_PATH:CONTAINER_PATH`.
- **Left side** `~/.n8n`: a folder on your host (`/home/msi/.n8n`). The shell expands `~` to your home.
- **Right side** `/home/node/.n8n`: where n8n (inside the container) stores its SQLite DB, workflows, credentials, encryption key.
- The `-v` creates a two-way link: anything written by the container at `/home/node/.n8n` actually lives at `~/.n8n` on the host. Survives container restarts, rebuilds, deletes.
- This form is a **bind mount** (host path on the left).
  Alternative form: `-v n8n_data:/home/node/.n8n` is a **named volume** — Docker manages the storage location, you don't see it as a folder.

### The ownership gotcha (bind mount only)

- The n8n container runs as user `node` (uid 1000).
- If `~/.n8n` doesn't exist and Docker creates it, it's owned by **root** (the Docker daemon runs as root).
- The `node` user then can't write → n8n crashes with `EACCES: permission denied`.
- One-time fix:
  ```bash
  docker run --rm -v ~/.n8n:/data alpine chown -R 1000:1000 /data
  ```
- After that, the bind mount works forever. This is exactly what we hit in Phase 0 of the demo setup.

## ⑥ `-d` — detached mode

- **Without `-d`**: container runs in foreground; logs stream to your terminal; `Ctrl+C` stops it.
- **With `-d`**: container runs in background; Docker prints the container ID and returns control to the shell.
- For interactive debugging: drop `-d` and add `-it` (`docker run -it --name n8n ...`) to see logs live.
- For production / demo startup: `-d` is correct.

---

## Flag order doesn't matter (for flags)

These three commands are equivalent:

```bash
docker run -d --name n8n --rm -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
docker run --name n8n --rm -d -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
docker run -v ~/.n8n:/home/node/.n8n -p 5678:5678 --rm --name n8n -d n8nio/n8n
```

But the **image name MUST be last** (after all flags). Anything after the image name is passed as arguments to the container's main process, not to `docker run`.

---

## Useful follow-up commands

```bash
docker ps                    # list running containers
docker ps -a                 # list ALL containers, including stopped
docker logs -f n8n           # stream n8n's logs live
docker stop n8n              # stop gracefully
docker restart n8n           # stop + start (useful after config change)
docker exec -it n8n sh       # get a shell inside the running container
docker inspect n8n           # full JSON details: mounts, env vars, network, etc.
docker rm n8n                # delete a stopped container
docker rmi n8nio/n8n         # delete the image itself (forces redownload next time)
```

---

## Quick comparison — the two variants in this project

| | `START_DEMO.sh` (for the trainer / demo author) | `PREREQS.md` (for 100 students) |
|---|---|---|
| `--rm` flag | Present — clean teardown after demo | Absent — preserve logs for debugging |
| Volume | `~/.n8n` (bind mount) — host-side file access | `n8n_data` (named volume) — no permission bug |
| Use case | One user who knows how to debug | Many users, each needs the safest default |

Both are correct for their context. Don't unify them — they're deliberately different.
