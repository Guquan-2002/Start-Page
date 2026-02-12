#!/bin/bash
echo "Starting local server..."
echo "Open browser and visit: http://localhost:7120"
echo "Press Ctrl+C to stop the server"
python3 -m http.server 7120
