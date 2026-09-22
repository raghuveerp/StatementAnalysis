.PHONY: run serve pip venv

BACKEND_DIR := backend
FRONTEND_DIR := frontend
VENV_DIR := $(BACKEND_DIR)/venv
VENV_PIP := $(VENV_DIR)/bin/pip
VENV_UVICORN := $(VENV_DIR)/bin/uvicorn

# Create venv (if missing) and install backend Python dependencies into it
pip:
	test -d $(VENV_DIR) || python3 -m venv $(VENV_DIR)
	$(VENV_PIP) install -r $(BACKEND_DIR)/requirements.txt

# Serve only the backend (FastAPI/uvicorn) using the venv
venv:
	cd $(BACKEND_DIR) && ./venv/bin/uvicorn main:app --reload

# Serve only the frontend (Vite dev server)
serve:
	cd $(FRONTEND_DIR) && npm run dev

# Run both frontend and backend together
run:
	@trap 'kill 0' EXIT; \
	$(MAKE) venv & \
	$(MAKE) serve & \
	wait
