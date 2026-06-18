package main

import (
	"encoding/json"
	"log"
	"net/http"
)

// --- SHARED DATA STRUCTURES (Efficiently using float64 for pixel precision) ---

type Color struct {
	R float64 `json:"r"`
	G float64 `json:"g"`
	B float64 `json:"b"`
	A float64 `json:"a"`
}

type LayoutData struct {
	WidthMode     string  `json:"widthMode"`
	HeightMode    string  `json:"heightMode"`
	Width         float64 `json:"width,omitempty"`
	Height        float64 `json:"height,omitempty"`
	FlexDirection string  `json:"flexDirection,omitempty"`
	Gap           float64 `json:"gap,omitempty"`
	PaddingTop    float64 `json:"paddingTop,omitempty"`
	PaddingRight  float64 `json:"paddingRight,omitempty"`
	PaddingBottom float64 `json:"paddingBottom,omitempty"`
	PaddingLeft   float64 `json:"paddingLeft,omitempty"`
}

type TypographyData struct {
	FontFamily string  `json:"fontFamily"`
	FontSize   float64 `json:"fontSize"`
	FontWeight string  `json:"fontWeight"`
	LineHeight float64 `json:"lineHeight,omitempty"`
	Color      *Color  `json:"color,omitempty"`
}

// --- SET 1: IncomingNode (Input from DOM Extractor / Frontend) ---
// Represents raw data extracted from the web page.

type IncomingNode struct {
	Type            string          `json:"type"` // "FRAME" or "TEXT"
	Name            string          `json:"name,omitempty"`
	Layout          LayoutData      `json:"layout"`
	BackgroundColor *Color          `json:"backgroundColor,omitempty"`
	Characters      string          `json:"characters,omitempty"`
	Typography      *TypographyData `json:"typography,omitempty"`

	// Using an array of pointers (*IncomingNode) is crucial in Golang for
	// tree data structures (recursive trees). This prevents excessive 
	// memory allocation duplication on the stack when processing deep DOM trees.
	Children []*IncomingNode `json:"children,omitempty"`
}

// --- SET 2: FigmaNodeData (Output directed to Figma API) ---
// Represents the structure filtered or manipulated by Go
// that is ready to be directly consumed by the Figma Sandbox.

type FigmaNodeData struct {
	Type            string          `json:"type"`
	Name            string          `json:"name,omitempty"`
	Layout          LayoutData      `json:"layout"`
	BackgroundColor *Color          `json:"backgroundColor,omitempty"`
	Characters      string          `json:"characters,omitempty"`
	Typography      *TypographyData `json:"typography,omitempty"`

	// Using pointers for efficient data transfer (Pass-by-Reference)
	Children []*FigmaNodeData `json:"children,omitempty"`
}

// --- HTTP HANDLERS ---

func parseLayoutHandler(w http.ResponseWriter, r *http.Request) {
	// Only allow POST method
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	// 1. Unmarshal JSON Payload to IncomingNode structure
	var rootNode IncomingNode
	err := json.NewDecoder(r.Body).Decode(&rootNode)
	if err != nil {
		http.Error(w, "Invalid JSON Payload: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Processing simulation
	log.Printf("Successfully parsed tree structure. Root Type: %s, Direct Children Count: %d\n", rootNode.Type, len(rootNode.Children))

	// 2. Respond with HTTP 200 OK
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	
	response := map[string]string{
		"status":  "success",
		"message": "DOM Layout successfully parsed by Go Microservice",
	}
	json.NewEncoder(w).Encode(response)
}

func main() {
	http.HandleFunc("/parse-layout", parseLayoutHandler)

	log.Println("Golang Microservice running on port 8080...")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
