// eWei Gas Sponsorship — Go Example
//
// Sponsor a BNB transfer using the eWei REST API from Go.
//
// Usage:
//
//	EWEI_API_KEY=ek_live_... go run examples/go/main.go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

const defaultRelayerURL = "https://relayer.ewei.io"

// Client wraps eWei relayer HTTP calls.
type Client struct {
	APIKey     string
	RelayerURL string
	HTTP       *http.Client
}

// TxRequest represents a BSC transaction to sponsor.
type TxRequest struct {
	From    string `json:"from"`
	To      string `json:"to"`
	Value   string `json:"value"`
	Data    string `json:"data"`
	ChainID int    `json:"chainId"`
}

// SponsorResponse is returned after submitting a tx for sponsorship.
type SponsorResponse struct {
	SponsorID string `json:"sponsorId"`
	TxHash    string `json:"txHash"`
	Status    string `json:"status"`
}

// EstimateResponse contains gas estimation details.
type EstimateResponse struct {
	GasUnits     string `json:"gasUnits"`
	TotalCostBnb string `json:"totalCostBnb"`
	CanSponsor   bool   `json:"canSponsor"`
}

// BalanceResponse contains account balance info.
type BalanceResponse struct {
	BalanceBnb string `json:"balanceBnb"`
}

// NewClient creates an eWei client.
func NewClient(apiKey string) *Client {
	relayerURL := os.Getenv("EWEI_RELAYER_URL")
	if relayerURL == "" {
		relayerURL = defaultRelayerURL
	}
	return &Client{
		APIKey:     apiKey,
		RelayerURL: relayerURL,
		HTTP:       &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *Client) doRequest(method, path string, body any, out any) error {
	var reader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("marshal body: %w", err)
		}
		reader = bytes.NewReader(b)
	}

	req, err := http.NewRequest(method, c.RelayerURL+path, reader)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.APIKey)

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		data, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("relayer error %d: %s", resp.StatusCode, string(data))
	}

	return json.NewDecoder(resp.Body).Decode(out)
}

// Balance returns the sponsor account balance.
func (c *Client) Balance() (*BalanceResponse, error) {
	var out BalanceResponse
	err := c.doRequest("GET", "/v1/account/balance", nil, &out)
	return &out, err
}

// Estimate returns gas estimation for a transaction.
func (c *Client) Estimate(tx TxRequest) (*EstimateResponse, error) {
	var out EstimateResponse
	err := c.doRequest("POST", "/v1/estimate", map[string]any{"tx": tx}, &out)
	return &out, err
}

// Sponsor submits a transaction for gas sponsorship.
func (c *Client) Sponsor(tx TxRequest) (*SponsorResponse, error) {
	var out SponsorResponse
	err := c.doRequest("POST", "/v1/sponsor", map[string]any{"tx": tx}, &out)
	return &out, err
}

// Status checks the current status of a sponsored transaction.
func (c *Client) Status(sponsorID string) (*SponsorResponse, error) {
	var out SponsorResponse
	err := c.doRequest("GET", "/v1/sponsor/"+sponsorID+"/status", nil, &out)
	return &out, err
}

func main() {
	apiKey := os.Getenv("EWEI_API_KEY")
	if apiKey == "" {
		fmt.Fprintln(os.Stderr, "EWEI_API_KEY is required")
		os.Exit(1)
	}

	client := NewClient(apiKey)

	// 1. Check balance
	bal, err := client.Balance()
	if err != nil {
		fmt.Fprintf(os.Stderr, "balance error: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Sponsor balance: %s BNB\n", bal.BalanceBnb)

	// 2. Define a BSC transfer
	tx := TxRequest{
		From:    "0xYourUserWalletAddress",
		To:      "0xRecipientAddress",
		Value:   "0x2386F26FC10000", // 0.01 BNB
		Data:    "0x",
		ChainID: 56,
	}

	// 3. Estimate gas
	est, err := client.Estimate(tx)
	if err != nil {
		fmt.Fprintf(os.Stderr, "estimate error: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Estimated cost: %s BNB\n", est.TotalCostBnb)

	if !est.CanSponsor {
		fmt.Fprintln(os.Stderr, "Insufficient sponsor balance")
		os.Exit(1)
	}

	// 4. Sponsor the transaction
	result, err := client.Sponsor(tx)
	if err != nil {
		fmt.Fprintf(os.Stderr, "sponsor error: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Sponsor ID: %s\n", result.SponsorID)

	// 5. Poll for confirmation
	for result.Status == "pending" || result.Status == "submitted" {
		time.Sleep(3 * time.Second)
		result, err = client.Status(result.SponsorID)
		if err != nil {
			fmt.Fprintf(os.Stderr, "status error: %v\n", err)
			os.Exit(1)
		}
		fmt.Printf("Status: %s\n", result.Status)
	}

	if result.Status == "confirmed" {
		fmt.Printf("Confirmed! https://bscscan.com/tx/%s\n", result.TxHash)
	} else {
		fmt.Printf("Transaction %s\n", result.Status)
	}
}
