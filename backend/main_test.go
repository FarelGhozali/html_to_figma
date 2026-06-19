package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestParseLayoutEndpoint(t *testing.T) {
	// 1. Create a dummy JSON payload (div with flex-direction: row and red background color)
	payload := []byte(`{
		"type": "FRAME",
		"name": "div",
		"layout": {
			"flexDirection": "row",
			"widthMode": "FIXED",
			"heightMode": "FIXED",
			"width": "100px",
			"height": "100px"
		},
		"backgroundColor": {
			"r": 1.0,
			"g": 0.0,
			"b": 0.0,
			"a": 1.0
		}
	}`)

	// 2. Create an HTTP POST request
	req, err := http.NewRequest("POST", "/parse-layout", bytes.NewBuffer(payload))
	if err != nil {
		t.Fatalf("Failed to create request: %v", err)
	}

	// Create a ResponseRecorder (which satisfies http.ResponseWriter) to record the response
	rr := httptest.NewRecorder()
	
	// Create an HTTP handler from our parseLayoutHandler
	handler := http.HandlerFunc(parseLayoutHandler)

	// Serve the HTTP request to our handler
	handler.ServeHTTP(rr, req)

	// 3. Assertions
	
	// Check the status code is 200 OK
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("Handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	// Parse the response body into FigmaNodeData struct
	var response FigmaNodeData
	err = json.NewDecoder(rr.Body).Decode(&response)
	if err != nil {
		t.Fatalf("Failed to decode response JSON: %v", err)
	}

	// Check if layoutMode was correctly translated to HORIZONTAL
	if response.Layout.LayoutMode != "HORIZONTAL" {
		t.Errorf("Expected layoutMode to be HORIZONTAL, got %v", response.Layout.LayoutMode)
	}

	// Check if background color was correctly preserved (Red: R=1.0, G=0.0, B=0.0, A=1.0)
	if response.BackgroundColor == nil {
		t.Fatalf("Expected backgroundColor to not be nil")
	}
	if response.BackgroundColor.R != 1.0 || response.BackgroundColor.G != 0.0 || response.BackgroundColor.B != 0.0 {
		t.Errorf("Expected background color to be Red (1.0, 0.0, 0.0), got (%v, %v, %v)", 
			response.BackgroundColor.R, response.BackgroundColor.G, response.BackgroundColor.B)
	}
}
