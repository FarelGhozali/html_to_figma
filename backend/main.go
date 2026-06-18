package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
)

// --- SHARED DATA STRUCTURES ---

type Color struct {
	R float64 `json:"r"`
	G float64 `json:"g"`
	B float64 `json:"b"`
	A float64 `json:"a"`
}

type TypographyData struct {
	FontFamily string  `json:"fontFamily"`
	FontSize   float64 `json:"fontSize"`
	FontWeight string  `json:"fontWeight"`
	LineHeight float64 `json:"lineHeight,omitempty"`
	Color      *Color  `json:"color,omitempty"`
}

// --- SET 1: IncomingNode (Input from DOM Extractor) ---

type IncomingLayout struct {
	WidthMode      string      `json:"widthMode"`
	HeightMode     string      `json:"heightMode"`
	Width          interface{} `json:"width,omitempty"`
	Height         interface{} `json:"height,omitempty"`
	FlexDirection  string      `json:"flexDirection,omitempty"`
	JustifyContent string      `json:"justifyContent,omitempty"`
	AlignItems     string      `json:"alignItems,omitempty"`
	Gap            interface{} `json:"gap,omitempty"`
	PaddingTop     interface{} `json:"paddingTop,omitempty"`
	PaddingRight   interface{} `json:"paddingRight,omitempty"`
	PaddingBottom  interface{} `json:"paddingBottom,omitempty"`
	PaddingLeft    interface{} `json:"paddingLeft,omitempty"`
}

type IncomingNode struct {
	Type            string          `json:"type"` // "FRAME" or "TEXT"
	Name            string          `json:"name,omitempty"`
	Layout          IncomingLayout  `json:"layout"`
	BackgroundColor *Color          `json:"backgroundColor,omitempty"`
	Characters      string          `json:"characters,omitempty"`
	Typography      *TypographyData `json:"typography,omitempty"`
	Children        []*IncomingNode `json:"children,omitempty"`
}

// --- SET 2: FigmaNodeData (Output directed to Figma API) ---

type FigmaLayout struct {
	LayoutMode            string  `json:"layoutMode,omitempty"` // HORIZONTAL or VERTICAL
	PrimaryAxisSizingMode string  `json:"primaryAxisSizingMode,omitempty"`
	CounterAxisSizingMode string  `json:"counterAxisSizingMode,omitempty"`
	PrimaryAxisAlignItems string  `json:"primaryAxisAlignItems,omitempty"`
	CounterAxisAlignItems string  `json:"counterAxisAlignItems,omitempty"`
	ItemSpacing           float64 `json:"itemSpacing,omitempty"`
	PaddingTop            float64 `json:"paddingTop,omitempty"`
	PaddingRight          float64 `json:"paddingRight,omitempty"`
	PaddingBottom         float64 `json:"paddingBottom,omitempty"`
	PaddingLeft           float64 `json:"paddingLeft,omitempty"`
	Width                 float64 `json:"width,omitempty"`
	Height                float64 `json:"height,omitempty"`
}

type FigmaNodeData struct {
	Type            string           `json:"type"`
	Name            string           `json:"name,omitempty"`
	Layout          FigmaLayout      `json:"layout"`
	BackgroundColor *Color           `json:"backgroundColor,omitempty"`
	Characters      string           `json:"characters,omitempty"`
	Typography      *TypographyData  `json:"typography,omitempty"`
	Children        []*FigmaNodeData `json:"children,omitempty"`
}

// --- TRANSLATION LOGIC ---

// parsePixelValue parses generic CSS strings like "16px" into strict float64 values.
func parsePixelValue(val interface{}) float64 {
	if val == nil {
		return 0
	}
	switch v := val.(type) {
	case float64:
		return v
	case string:
		v = strings.ToLower(strings.TrimSpace(v))
		v = strings.TrimSuffix(v, "px")
		f, err := strconv.ParseFloat(v, 64)
		if err != nil {
			return 0 // Edge case: fallback to 0 if format is invalid
		}
		return f
	default:
		return 0
	}
}

// TranslateFlexboxToAutoLayout is a pure function that recursively translates
// CSS layout concepts into strict Figma Auto Layout parameters.
func TranslateFlexboxToAutoLayout(incoming *IncomingNode) FigmaNodeData {
	if incoming == nil {
		return FigmaNodeData{}
	}

	// 1. Map flex-direction to Figma layoutMode
	layoutMode := "NONE"
	if strings.ToLower(incoming.Layout.FlexDirection) == "row" {
		layoutMode = "HORIZONTAL"
	} else if strings.ToLower(incoming.Layout.FlexDirection) == "column" {
		layoutMode = "VERTICAL"
	}

	// 2. Map justifyContent to primaryAxisAlignItems
	primaryAlign := "MIN" // Default fallback
	switch strings.ToLower(incoming.Layout.JustifyContent) {
	case "center":
		primaryAlign = "CENTER"
	case "flex-end", "end":
		primaryAlign = "MAX"
	case "space-between":
		primaryAlign = "SPACE_BETWEEN"
	}

	// 3. Map alignItems to counterAxisAlignItems
	counterAlign := "MIN" // Default fallback
	switch strings.ToLower(incoming.Layout.AlignItems) {
	case "center":
		counterAlign = "CENTER"
	case "flex-end", "end":
		counterAlign = "MAX"
	case "baseline":
		counterAlign = "BASELINE"
	}

	// Build the strict Figma layout structure
	figmaLayout := FigmaLayout{
		LayoutMode:            layoutMode,
		PrimaryAxisAlignItems: primaryAlign,
		CounterAxisAlignItems: counterAlign,
		PrimaryAxisSizingMode: incoming.Layout.WidthMode,   // Maps HUG/FIXED logic based on DOM attributes
		CounterAxisSizingMode: incoming.Layout.HeightMode,  // Maps HUG/FIXED logic based on DOM attributes
		ItemSpacing:           parsePixelValue(incoming.Layout.Gap),
		PaddingTop:            parsePixelValue(incoming.Layout.PaddingTop),
		PaddingRight:          parsePixelValue(incoming.Layout.PaddingRight),
		PaddingBottom:         parsePixelValue(incoming.Layout.PaddingBottom),
		PaddingLeft:           parsePixelValue(incoming.Layout.PaddingLeft),
		Width:                 parsePixelValue(incoming.Layout.Width),
		Height:                parsePixelValue(incoming.Layout.Height),
	}

	// Recursively translate children
	var translatedChildren []*FigmaNodeData
	for _, child := range incoming.Children {
		childData := TranslateFlexboxToAutoLayout(child)
		translatedChildren = append(translatedChildren, &childData)
	}

	return FigmaNodeData{
		Type:            incoming.Type,
		Name:            incoming.Name,
		Layout:          figmaLayout,
		BackgroundColor: incoming.BackgroundColor,
		Characters:      incoming.Characters,
		Typography:      incoming.Typography,
		Children:        translatedChildren,
	}
}

// --- HTTP HANDLERS ---

func parseLayoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var rootNode IncomingNode
	err := json.NewDecoder(r.Body).Decode(&rootNode)
	if err != nil {
		http.Error(w, "Invalid JSON Payload: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Execute pure function translation
	figmaNodeTree := TranslateFlexboxToAutoLayout(&rootNode)

	log.Printf("Successfully translated tree. Root Figma Node: %s, Children: %d\n", figmaNodeTree.Type, len(figmaNodeTree.Children))

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	
	// Return the strictly formatted FigmaNodeData as JSON
	json.NewEncoder(w).Encode(figmaNodeTree)
}

func main() {
	http.HandleFunc("/parse-layout", parseLayoutHandler)

	log.Println("Golang Microservice running on port 8080...")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
