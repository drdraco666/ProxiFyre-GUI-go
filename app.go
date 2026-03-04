package main

import (
	"archive/zip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"time"
)

// Config structure
type Config struct {
	LogLevel string  `json:"logLevel"`
	Proxies  []Proxy `json:"proxies"`
}

// Proxy structure
type Proxy struct {
	AppNames            []string `json:"appNames"`
	Socks5ProxyEndpoint string   `json:"socks5ProxyEndpoint"`
	Username            string   `json:"username"`
	Password            string   `json:"password"`
	SupportedProtocols  []string `json:"supportedProtocols"`
}

// App struct
type App struct {
	ctx    context.Context
	config *Config
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		config: &Config{
			LogLevel: "Error",
			Proxies: []Proxy{
				{
					AppNames:            []string{},
					Socks5ProxyEndpoint: "",
					Username:            "",
					Password:            "",
					SupportedProtocols:  []string{"TCP", "UDP"},
				},
			},
		},
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Ensure config is in the executable directory
	if err := a.EnsureConfigInExecutableDir(); err != nil {
		fmt.Printf("⚠️ Warning: %v\n", err)
	}

	a.loadConfig()
}

// loadConfig loads configuration from file
func (a *App) loadConfig() {
	configPath := a.GetConfigPath()
	if _, err := os.Stat(configPath); err == nil {
		data, err := ioutil.ReadFile(configPath)
		if err == nil {
			json.Unmarshal(data, &a.config)
		}
	}
}

// SaveConfig saves configuration to file
func (a *App) SaveConfig(configData string) error {
	var config Config
	if err := json.Unmarshal([]byte(configData), &config); err != nil {
		return err
	}

	a.config = &config

	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}

	configPath := a.GetConfigPath()
	return ioutil.WriteFile(configPath, data, 0644)
}

// GetConfig returns current configuration
func (a *App) GetConfig() string {
	data, _ := json.Marshal(a.config)
	return string(data)
}

// GetCurrentDirectory returns current working directory
func (a *App) GetCurrentDirectory() string {
	dir, _ := os.Getwd()
	return dir
}

// GetExecutableDirectory returns the directory where the executable resides
func (a *App) GetExecutableDirectory() string {
	executable, err := os.Executable()
	if err != nil {
		return a.GetCurrentDirectory()
	}
	return filepath.Dir(executable)
}

// EnsureConfigInExecutableDir checks that config is in the same directory as the executable
func (a *App) EnsureConfigInExecutableDir() error {
	execDir := a.GetExecutableDirectory()
	currentDir := a.GetCurrentDirectory()

	// If not in executable directory, copy config there
	if execDir != currentDir {
		sourceConfig := filepath.Join(currentDir, "app-config.json")
		targetConfig := filepath.Join(execDir, "app-config.json")

		// Check if config exists in current directory
		if _, err := os.Stat(sourceConfig); err == nil {
			// Copy config to executable directory
			data, err := ioutil.ReadFile(sourceConfig)
			if err != nil {
				return fmt.Errorf("could not read config: %v", err)
			}

			err = ioutil.WriteFile(targetConfig, data, 0644)
			if err != nil {
				return fmt.Errorf("could not copy config: %v", err)
			}

			fmt.Printf("✅ Config copied to executable directory: %s\n", execDir)
		}

		// Check for ProxiFyre.exe in executable directory
		proxifyrePath := filepath.Join(execDir, "ProxiFyre.exe")
		if _, err := os.Stat(proxifyrePath); err == nil {
			fmt.Printf("✅ ProxiFyre.exe found in executable directory: %s\n", execDir)
		} else {
			fmt.Printf("⚠️ ProxiFyre.exe not found in executable directory: %s\n", execDir)
		}
	}

	return nil
}

// GetConfigPath returns full path to config file
func (a *App) GetConfigPath() string {
	execDir := a.GetExecutableDirectory()
	return filepath.Join(execDir, "app-config.json")
}

// CheckProxiFyreExists checks for ProxiFyre.exe
func (a *App) CheckProxiFyreExists() bool {
	_, err := os.Stat("ProxiFyre.exe")
	return err == nil
}

// RunProxiFyre launches ProxiFyre.exe
func (a *App) RunProxiFyre() error {
	fmt.Printf("🔄 RunProxiFyre called\n")

	currentDir := a.GetCurrentDirectory()
	fmt.Printf("📁 Current directory: %s\n", currentDir)

	execDir := a.GetExecutableDirectory()
	fmt.Printf("📁 Executable directory: %s\n", execDir)

	// Check ProxiFyre.exe in current directory
	proxiFyrePathCurrent := filepath.Join(currentDir, "ProxiFyre.exe")
	fmt.Printf("🔍 Checking ProxiFyre.exe in current directory: %s\n", proxiFyrePathCurrent)

	// Check ProxiFyre.exe in executable directory
	proxiFyrePathExec := filepath.Join(execDir, "ProxiFyre.exe")
	fmt.Printf("🔍 Checking ProxiFyre.exe in executable directory: %s\n", proxiFyrePathExec)

	var proxiFyrePath string

	if _, err := os.Stat(proxiFyrePathCurrent); err == nil {
		proxiFyrePath = proxiFyrePathCurrent
		fmt.Printf("✅ ProxiFyre.exe found in current directory\n")
	} else if _, err := os.Stat(proxiFyrePathExec); err == nil {
		proxiFyrePath = proxiFyrePathExec
		fmt.Printf("✅ ProxiFyre.exe found in executable directory\n")
	} else {
		errorMsg := fmt.Sprintf("ProxiFyre.exe not found in current directory (%s) nor in executable directory (%s)", currentDir, execDir)
		fmt.Printf("❌ %s\n", errorMsg)
		return fmt.Errorf(errorMsg)
	}

	fmt.Printf("🚀 Launching ProxiFyre: %s\n", proxiFyrePath)
	cmd := exec.Command(proxiFyrePath)
	cmd.Dir = filepath.Dir(proxiFyrePath)

	if runtime.GOOS == "windows" {
		cmd.SysProcAttr = &syscall.SysProcAttr{
			HideWindow: true,
		}
	}

	err := cmd.Start()
	if err != nil {
		errorMsg := fmt.Sprintf("Error starting ProxiFyre: %v", err)
		fmt.Printf("❌ %s\n", errorMsg)
		return fmt.Errorf(errorMsg)
	}

	fmt.Printf("✅ ProxiFyre started successfully (PID: %d)\n", cmd.Process.Pid)
	return nil
}

// StopProxiFyre stops ProxiFyre.exe
func (a *App) StopProxiFyre() error {
	fmt.Printf("🔄 StopProxiFyre called\n")

	if runtime.GOOS == "windows" {
		fmt.Printf("🛑 Stopping ProxiFyre.exe via taskkill\n")
		cmd := exec.Command("taskkill", "/F", "/IM", "ProxiFyre.exe")
		cmd.Dir = a.GetCurrentDirectory()

		err := cmd.Run()
		if err != nil {
			errorMsg := fmt.Sprintf("Error stopping ProxiFyre: %v", err)
			fmt.Printf("❌ %s\n", errorMsg)
			return fmt.Errorf(errorMsg)
		}

		fmt.Printf("✅ ProxiFyre stopped successfully\n")
		return nil
	}

	errorMsg := "Stop operation is supported only on Windows"
	fmt.Printf("❌ %s\n", errorMsg)
	return fmt.Errorf(errorMsg)
}

// DownloadProxiFyre downloads ProxiFyre
func (a *App) DownloadProxiFyre() error {
	fmt.Printf("🔄 DownloadProxiFyre called\n")

	// GitHub API to get latest release info
	apiURL := "https://api.github.com/repos/wiresock/proxifyre/releases/latest"
	fmt.Printf("📡 Request to GitHub API: %s\n", apiURL)

	// Create HTTP client with User-Agent
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		errorMsg := fmt.Sprintf("Error creating HTTP request: %v", err)
		fmt.Printf("❌ %s\n", errorMsg)
		return fmt.Errorf(errorMsg)
	}

	// Set headers as in Python version
	req.Header.Set("User-Agent", "Mozilla/5.0")
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	// Execute request
	resp, err := client.Do(req)
	if err != nil {
		errorMsg := fmt.Sprintf("Error making HTTP request: %v", err)
		fmt.Printf("❌ %s\n", errorMsg)
		return fmt.Errorf(errorMsg)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		errorMsg := fmt.Sprintf("GitHub API returned status: %d", resp.StatusCode)
		fmt.Printf("❌ %s\n", errorMsg)
		return fmt.Errorf(errorMsg)
	}

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		errorMsg := fmt.Sprintf("Error reading response: %v", err)
		fmt.Printf("❌ %s\n", errorMsg)
		return fmt.Errorf(errorMsg)
	}

	// Parse JSON response
	var releaseData map[string]interface{}
	if err := json.Unmarshal(body, &releaseData); err != nil {
		errorMsg := fmt.Sprintf("Error parsing JSON: %v", err)
		fmt.Printf("❌ %s\n", errorMsg)
		return fmt.Errorf(errorMsg)
	}

	// Get release info
	tagName, _ := releaseData["tag_name"].(string)
	fmt.Printf("📦 Found release: %s\n", tagName)

	// Look for archive link (as in Python version)
	var zipURL string
	if assets, ok := releaseData["assets"].([]interface{}); ok {
		for _, asset := range assets {
			if assetMap, ok := asset.(map[string]interface{}); ok {
				assetName, _ := assetMap["name"].(string)
				if strings.Contains(strings.ToLower(assetName), "x64-signed.zip") ||
					strings.Contains(strings.ToLower(assetName), "x86-signed.zip") {
					zipURL, _ = assetMap["browser_download_url"].(string)
					break
				}
			}
		}
	}

	if zipURL == "" {
		errorMsg := "Could not find archive in release"
		fmt.Printf("❌ %s\n", errorMsg)
		return fmt.Errorf(errorMsg)
	}

	fmt.Printf("🔗 Downloading: %s\n", zipURL)

	// Create temporary folder for download
	tempDir, err := os.MkdirTemp("", "proxifyre-download")
	if err != nil {
		errorMsg := fmt.Sprintf("Error creating temp folder: %v", err)
		fmt.Printf("❌ %s\n", errorMsg)
		return fmt.Errorf(errorMsg)
	}
	defer os.RemoveAll(tempDir) // Clean up temp folder on exit

	zipPath := filepath.Join(tempDir, "proxifyre.zip")
	fmt.Printf("📁 Temp folder: %s\n", tempDir)

	// Download archive
	fmt.Printf("📥 Downloading archive...\n")
	zipResp, err := http.Get(zipURL)
	if err != nil {
		errorMsg := fmt.Sprintf("Error downloading archive: %v", err)
		fmt.Printf("❌ %s\n", errorMsg)
		return fmt.Errorf(errorMsg)
	}
	defer zipResp.Body.Close()

	zipFile, err := os.Create(zipPath)
	if err != nil {
		errorMsg := fmt.Sprintf("Error creating archive file: %v", err)
		fmt.Printf("❌ %s\n", errorMsg)
		return fmt.Errorf(errorMsg)
	}
	defer zipFile.Close()

	_, err = io.Copy(zipFile, zipResp.Body)
	if err != nil {
		errorMsg := fmt.Sprintf("Error saving archive: %v", err)
		fmt.Printf("❌ %s\n", errorMsg)
		return fmt.Errorf(errorMsg)
	}

	fmt.Printf("📦 Archive downloaded, extracting...\n")

	// Extract archive
	execDir := a.GetExecutableDirectory()
	fmt.Printf("📁 Extracting to: %s\n", execDir)

	archive, err := zip.OpenReader(zipPath)
	if err != nil {
		errorMsg := fmt.Sprintf("Error opening archive: %v", err)
		fmt.Printf("❌ %s\n", errorMsg)
		return fmt.Errorf(errorMsg)
	}
	defer archive.Close()

	// Count extracted files
	extractedFiles := 0
	for _, file := range archive.File {
		if file.FileInfo().IsDir() {
			continue
		}

		// Check file extension (as in Python version)
		fileName := file.Name
		if strings.HasSuffix(strings.ToLower(fileName), ".exe") ||
			strings.HasSuffix(strings.ToLower(fileName), ".dll") ||
			strings.HasSuffix(strings.ToLower(fileName), ".txt") ||
			strings.HasSuffix(strings.ToLower(fileName), ".md") {

			// Create extraction path
			extractPath := filepath.Join(execDir, fileName)

			// Create directories if needed
			if err := os.MkdirAll(filepath.Dir(extractPath), 0755); err != nil {
				fmt.Printf("⚠️ Could not create directory for %s: %v\n", fileName, err)
				continue
			}

			// Create file
			dstFile, err := os.Create(extractPath)
			if err != nil {
				fmt.Printf("⚠️ Could not create file %s: %v\n", fileName, err)
				continue
			}

			// Open file in archive
			srcFile, err := file.Open()
			if err != nil {
				dstFile.Close()
				fmt.Printf("⚠️ Could not open file in archive %s: %v\n", fileName, err)
				continue
			}

			// Copy content
			_, err = io.Copy(dstFile, srcFile)
			srcFile.Close()
			dstFile.Close()

			if err != nil {
				fmt.Printf("⚠️ Could not copy file %s: %v\n", fileName, err)
				continue
			}

			extractedFiles++
			fmt.Printf("✅ Extracted file: %s\n", fileName)
		}
	}

	if extractedFiles > 0 {
		successMsg := fmt.Sprintf("Archive extracted successfully! Files extracted: %d", extractedFiles)
		fmt.Printf("✅ %s\n", successMsg)
		return nil
	} else {
		errorMsg := "Failed to extract archive"
		fmt.Printf("❌ %s\n", errorMsg)
		return fmt.Errorf(errorMsg)
	}
}

// InstallService installs ProxiFyre as a service
func (a *App) InstallService() error {
	if !a.CheckProxiFyreExists() {
		return fmt.Errorf("ProxiFyre.exe not found in current directory")
	}

	cmd := exec.Command("ProxiFyre.exe", "install")
	cmd.Dir = a.GetCurrentDirectory()
	return cmd.Run()
}

// UninstallService uninstalls ProxiFyre service
func (a *App) UninstallService() error {
	if !a.CheckProxiFyreExists() {
		return fmt.Errorf("ProxiFyre.exe not found in current directory")
	}

	cmd := exec.Command("ProxiFyre.exe", "uninstall")
	cmd.Dir = a.GetCurrentDirectory()
	return cmd.Run()
}

// StartService starts ProxiFyre service
func (a *App) StartService() error {
	if !a.CheckProxiFyreExists() {
		return fmt.Errorf("ProxiFyre.exe not found in current directory")
	}

	cmd := exec.Command("ProxiFyre.exe", "start")
	cmd.Dir = a.GetCurrentDirectory()
	return cmd.Run()
}

// StopService stops ProxiFyre service
func (a *App) StopService() error {
	if !a.CheckProxiFyreExists() {
		return fmt.Errorf("ProxiFyre.exe not found in current directory")
	}

	cmd := exec.Command("ProxiFyre.exe", "stop")
	cmd.Dir = a.GetCurrentDirectory()
	return cmd.Run()
}

// GetServiceStatus returns service status
func (a *App) GetServiceStatus() string {
	if runtime.GOOS != "windows" {
		return "Not supported on this OS"
	}

	cmd := exec.Command("sc", "query", "ProxiFyre")
	output, err := cmd.Output()
	if err != nil {
		return "Service not found"
	}

	outputStr := string(output)
	if strings.Contains(outputStr, "RUNNING") {
		return "Running"
	} else if strings.Contains(outputStr, "STOPPED") {
		return "Stopped"
	}

	return "Unknown"
}

// GetTimestamp returns current time in HH:MM:SS format
func (a *App) GetTimestamp() string {
	return time.Now().Format("15:04:05")
}
