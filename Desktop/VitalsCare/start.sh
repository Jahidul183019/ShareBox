#!/bin/bash

# Cleanup function to kill all background processes on exit (e.g., when you press Ctrl+C)
cleanup() {
    echo -e "\n🛑 Stopping both frontend and backend servers..."
    kill 0
    exit
}

# Catch Ctrl+C (SIGINT) and termination signals
trap cleanup SIGINT SIGTERM

echo "🚀 Starting Community Health Risk Radar..."

# Load local environment variables if local.env exists
if [ -f "local.env" ]; then
    echo "Loading environment variables from local.env..."
    export $(grep -v '^#' local.env | xargs)
fi

# ==========================================
# 1. Start the Python Backend
# ==========================================
echo -e "\n[1/2] Setting up and starting Python Backend..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
else
    source venv/bin/activate
fi

# Install the full backend dependency set so fresh environments work too.
pip install -r requirements.txt

# Run the backend in the background (&)
python3 app.py &
cd ..

# ==========================================
# 2. Start the Vite Frontend
# ==========================================
echo -e "\n[2/2] Setting up and starting React Frontend..."
cd frontend

# Install node modules if they don't exist
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Run the frontend in the background (&)
npm run dev &
cd ..

echo -e "\n✅ Both servers are now running!"
echo -e "👉 Frontend is available at: http://localhost:5173 (or similar, check logs above)"
echo -e "👉 Backend is running on: http://127.0.0.1:8000"
echo -e "Press Ctrl+C to stop both servers gracefully."

# Wait indefinitely so the script doesn't exit immediately 
wait
