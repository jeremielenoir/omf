# Anomaly Detection API Client - C# SDK

A robust C# client library for interacting with the Anomaly Detection API, designed for Visual Studio 2017 and .NET Framework applications.

## Features

- ✅ **Visual Studio 2017 Compatible** - Built for .NET Framework 4.6.1+
- ✅ **Multipart File Upload** - Handles file uploads seamlessly
- ✅ **Comprehensive Error Handling** - Proper exception management
- ✅ **Async/Await Support** - Modern asynchronous programming
- ✅ **Synchronous Fallback** - Legacy support when needed
- ✅ **Timeout Configuration** - Configurable request timeouts
- ✅ **JSON Response Parsing** - Built-in JSON deserialization

## Installation

### Prerequisites
- Visual Studio 2017 or later
- .NET Framework 4.6.1 or higher
- NuGet Package Manager

### Required NuGet Packages
Install the following package via NuGet Package Manager:

```
Install-Package Newtonsoft.Json
```

**Or via Package Manager Console:**
1. Right-click on your project → "Manage NuGet Packages"
2. Search for "Newtonsoft.Json"
3. Click Install

## Quick Start

### Basic Usage

```csharp
using System;
using System.Threading.Tasks;

class Program
{
    static async Task Main(string[] args)
    {
        // Initialize the client with your API base URL
        var client = new AnomalyDetectionClient("https://goldkiosk-ai.smartlawyer.ai");
        
        try
        {
            // Detect anomalies in an image file
            string result = await client.DetectAnomalyAsync(@"C:\path\to\your\image.jpg");
            Console.WriteLine($"Detection Result: {result}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
        }
        finally
        {
            client.Dispose();
        }
    }
}
```

### Synchronous Usage (Legacy Support)

```csharp
var client = new AnomalyDetectionClient("https://goldkiosk-ai.smartlawyer.ai");

try
{
    string result = client.DetectAnomaly(@"C:\path\to\your\image.jpg");
    Console.WriteLine($"Detection Result: {result}");
}
catch (Exception ex)
{
    Console.WriteLine($"Error: {ex.Message}");
}
finally
{
    client.Dispose();
}
```

## API Reference

### AnomalyDetectionClient Class

#### Constructor
```csharp
public AnomalyDetectionClient(string baseUrl)
```
- **baseUrl**: The base URL of your Anomaly Detection API (e.g., "https://goldkiosk-ai.smartlawyer.ai")

#### Methods

##### DetectAnomalyAsync (Recommended)
```csharp
public async Task<string> DetectAnomalyAsync(string filePath)
```
Asynchronously detects anomalies in the specified file.

**Parameters:**
- `filePath` (string): Full path to the image file you want to analyze

**Returns:**
- `Task<string>`: JSON response from the API

**Throws:**
- `FileNotFoundException`: When the specified file doesn't exist
- `ValidationException`: When API returns validation errors (422)
- `TimeoutException`: When request times out
- `HttpRequestException`: For other HTTP errors

##### DetectAnomaly (Synchronous)
```csharp
public string DetectAnomaly(string filePath)
```
Synchronously detects anomalies in the specified file.

**Parameters:**
- `filePath` (string): Full path to the image file you want to analyze

**Returns:**
- `string`: JSON response from the API

**Note:** This method blocks the calling thread. Use `DetectAnomalyAsync` when possible.

##### Dispose
```csharp
public void Dispose()
```
Properly disposes of the HTTP client resources.

## Complete Code Implementation

```csharp
using System;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;
using Newtonsoft.Json;

public class AnomalyDetectionClient
{
    private readonly HttpClient _httpClient;
    private readonly string _baseUrl;

    public AnomalyDetectionClient(string baseUrl)
    {
        _baseUrl = baseUrl.TrimEnd('/');
        _httpClient = new HttpClient();
        
        // Configure timeout (default: 5 minutes)
        _httpClient.Timeout = TimeSpan.FromMinutes(5);
    }

    /// <summary>
    /// Detects anomalies in an image file asynchronously
    /// </summary>
    /// <param name="filePath">Path to the image file to analyze</param>
    /// <returns>Anomaly detection result as JSON string</returns>
    public async Task<string> DetectAnomalyAsync(string filePath)
    {
        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException($"File {filePath} does not exist.");
        }

        using (var form = new MultipartFormDataContent())
        {
            // Read image file contents
            var fileBytes = File.ReadAllBytes(filePath);
            var fileContent = new ByteArrayContent(fileBytes);
            
            // Add image file to multipart form
            // "file" parameter name as expected by the API
            form.Add(fileContent, "file", Path.GetFileName(filePath));

            try
            {
                // Make API call
                var response = await _httpClient.PostAsync($"{_baseUrl}/api/v1/detections/anomaly", form);
                
                if (response.IsSuccessStatusCode)
                {
                    var jsonResponse = await response.Content.ReadAsStringAsync();
                    return jsonResponse;
                }
                else if (response.StatusCode == System.Net.HttpStatusCode.UnprocessableEntity)
                {
                    // Handle validation errors (422)
                    var errorContent = await response.Content.ReadAsStringAsync();
                    var validationError = JsonConvert.DeserializeObject<ValidationErrorResponse>(errorContent);
                    throw new ValidationException($"Validation error: {validationError.Detail[0].Msg}");
                }
                else
                {
                    throw new HttpRequestException($"HTTP Error: {response.StatusCode} - {response.ReasonPhrase}");
                }
            }
            catch (TaskCanceledException ex)
            {
                if (ex.CancellationToken.IsCancellationRequested)
                {
                    throw new TimeoutException("Request timed out.");
                }
                throw;
            }
        }
    }

    /// <summary>
    /// Synchronous version of anomaly detection for images
    /// </summary>
    /// <param name="filePath">Path to the image file to analyze</param>
    /// <returns>Anomaly detection result as JSON string</returns>
    public string DetectAnomaly(string filePath)
    {
        return DetectAnomalyAsync(filePath).GetAwaiter().GetResult();
    }

    public void Dispose()
    {
        _httpClient?.Dispose();
    }
}

// Supporting classes for error handling
public class ValidationErrorResponse
{
    [JsonProperty("detail")]
    public ValidationErrorDetail[] Detail { get; set; }
}

public class ValidationErrorDetail
{
    [JsonProperty("loc")]
    public object[] Loc { get; set; }

    [JsonProperty("msg")]
    public string Msg { get; set; }

    [JsonProperty("type")]
    public string Type { get; set; }
}

public class ValidationException : Exception
{
    public ValidationException(string message) : base(message) { }
}
```

## Error Handling

The client provides comprehensive error handling for various scenarios:

### Exception Types

| Exception | Description | When it occurs |
|-----------|-------------|----------------|
| `FileNotFoundException` | File not found | When the specified file path doesn't exist |
| `ValidationException` | API validation error | When API returns 422 status code |
| `TimeoutException` | Request timeout | When request exceeds configured timeout |
| `HttpRequestException` | HTTP error | For other HTTP status codes |

### Error Handling Example

```csharp
try
{
    string result = await client.DetectAnomalyAsync(@"C:\myimage.jpg");
    // Process successful result
    Console.WriteLine($"Success: {result}");
}
catch (FileNotFoundException ex)
{
    Console.WriteLine($"File not found: {ex.Message}");
    // Handle missing file scenario
}
catch (ValidationException ex)
{
    Console.WriteLine($"Validation error: {ex.Message}");
    // Handle API validation errors
}
catch (TimeoutException ex)
{
    Console.WriteLine($"Request timed out: {ex.Message}");
    // Handle timeout scenario
}
catch (HttpRequestException ex)
{
    Console.WriteLine($"HTTP error: {ex.Message}");
    // Handle other HTTP errors
}
catch (Exception ex)
{
    Console.WriteLine($"Unexpected error: {ex.Message}");
    // Handle any other exceptions
}
```

## Configuration

### Timeout Configuration
You can modify the timeout by accessing the HttpClient:

```csharp
var client = new AnomalyDetectionClient("https://goldkiosk-ai.smartlawyer.ai");
// Set custom timeout (e.g., 10 minutes)
client._httpClient.Timeout = TimeSpan.FromMinutes(10);
```

### Supported Image File Types
The API accepts image files in binary format. Common supported formats include:
- **JPEG** (.jpg, .jpeg)
- **PNG** (.png)
- **BMP** (.bmp)
- **GIF** (.gif)
- **TIFF** (.tiff, .tif)
Ensure your image files are:
- Accessible from the specified path
- Not locked by other processes
- Within reasonable size limits for your API configuration
- In a supported image format

## API Endpoint Details

**Endpoint:** `POST /api/v1/detections/anomaly`

**Content-Type:** `multipart/form-data`

**Parameters:**
- `file` (required): Binary image file data

**Response Codes:**
- `200`: Successful response with anomaly detection results
- `422`: Validation error (malformed request or invalid image file)

**Response Format:**
```json
{
  "result": "detection_result_string"
}
```

## Best Practices

1. **Always use `using` statements** or call `Dispose()` to properly clean up resources
2. **Prefer async methods** (`DetectAnomalyAsync`) over synchronous ones
3. **Implement proper error handling** for all exception types
4. **Validate image file existence** before making API calls (though the client does this internally)
5. **Use appropriate timeouts** based on your image file sizes and network conditions
6. **Ensure image format compatibility** with the API requirements

## Troubleshooting

### Common Issues

#### "File not found" Error
- Ensure the image file path is correct and the file exists
- Check file permissions
- Use absolute paths when possible

#### Timeout Errors
- Increase timeout duration for large image files
- Check network connectivity
- Verify API server status

#### Validation Errors (422)
- Ensure image format is supported by the API (JPEG, PNG, BMP, GIF, TIFF)
- Check image file integrity
- Verify image file size limits
- Ensure image is not corrupted

#### JSON Parsing Errors
- Ensure Newtonsoft.Json package is properly installed
- Check API response format compatibility

## Support

For technical support or questions about this SDK:
1. Check the troubleshooting section above
2. Review the API documentation
3. Contact your API provider for server-side issues

## License

This SDK is provided as-is for integration with the Anomaly Detection API. Please refer to your API service agreement for usage terms.
