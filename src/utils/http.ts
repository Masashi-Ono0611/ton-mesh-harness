import https from 'https'

export interface HttpResponse<T = unknown> {
  statusCode: number
  headers: Record<string, string | string[] | undefined>
  body: T
}

export interface HttpOptions {
  headers?: Record<string, string>
  timeout?: number
  /**
   * Cap the response body size to defend against a buggy or malicious
   * server returning unbounded data. Defaults to 8 MiB, which is far
   * above any expected TONAPI / Toncenter response (typical: 1-20 KB).
   * Codex pre-GA self-audit class — resource-exhaustion defence.
   */
  maxBodyBytes?: number
}

const DEFAULT_MAX_BODY_BYTES = 8 * 1024 * 1024

/**
 * Perform an HTTPS GET request and parse JSON response.
 *
 * @param url - The URL to request
 * @param options - Optional headers and timeout
 * @returns Parsed JSON response
 * @throws {Error} On HTTP errors or invalid JSON
 */
export function httpsGet<T = unknown>(url: string, options: HttpOptions = {}): Promise<T> {
  const maxBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { ...options.headers, 'Accept': 'application/json' }, timeout: options.timeout },
      (res) => {
        let body = ''
        let bytesSoFar = 0
        let exceeded = false

        res.on('data', (chunk: Buffer) => {
          if (exceeded) return
          bytesSoFar += chunk.length
          if (bytesSoFar > maxBytes) {
            exceeded = true
            res.destroy()
            reject(
              new Error(
                `Response body exceeded ${maxBytes} bytes (got > ${bytesSoFar}) — refusing to buffer. ` +
                  `URL: ${url}`,
              ),
            )
            return
          }
          body += chunk
        })

        res.on('end', () => {
          if (exceeded) return
          // Handle 404 explicitly for better error messages
          if (res.statusCode === 404) {
            reject(new Error(`Not found: ${url}`))
            return
          }

          // Handle other error status codes
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`))
            return
          }

          // Parse JSON response
          try {
            const data = JSON.parse(body) as T
            resolve(data)
          } catch (err) {
            reject(new Error(`Invalid JSON response: ${err instanceof Error ? err.message : String(err)}`))
          }
        })
      }
    )

    req.on('error', (err) => {
      reject(new Error(`Network error: ${err.message}`))
    })

    req.on('timeout', () => {
      req.destroy()
      reject(new Error(`Request timeout after ${options.timeout || 'default'}ms`))
    })
  })
}
