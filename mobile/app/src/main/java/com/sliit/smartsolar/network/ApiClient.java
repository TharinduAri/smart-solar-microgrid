package com.sliit.smartsolar.network;

import android.os.Handler;
import android.os.Looper;

import com.sliit.smartsolar.BuildConfig;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Smart Solar Microgrid Trading System - Android Client.
 *
 * Thin HTTP helper built on HttpURLConnection so the project stays pure native
 * Android with no networking framework. Every screen reaches the C# Web API
 * through this class, which means no business logic and no server database
 * access ever lives inside the app.
 */
public final class ApiClient {

    /** Result handed back to the calling activity on the main thread. */
    public interface Callback {
        void onSuccess(String body);

        void onError(String message);
    }

    private static final ExecutorService EXECUTOR = Executors.newFixedThreadPool(4);
    private static final Handler MAIN = new Handler(Looper.getMainLooper());
    private static String authToken;

    private ApiClient() {
    }

    /** Stores the JWT returned by /api/auth/login so later calls are authorised. */
    public static void setAuthToken(String token) {
        authToken = token;
    }

    /** Sends a GET request to the Web API. */
    public static void get(String path, Callback callback) {
        send("GET", path, null, callback);
    }

    /** Sends a POST request with a JSON body. */
    public static void post(String path, JSONObject body, Callback callback) {
        send("POST", path, body, callback);
    }

    /** Sends a PUT request with a JSON body. */
    public static void put(String path, JSONObject body, Callback callback) {
        send("PUT", path, body, callback);
    }

    /**
     * Sends a PATCH request. HttpURLConnection cannot issue PATCH directly, so the
     * call is posted with the X-Http-Method-Override header that the API honours.
     */
    public static void patch(String path, JSONObject body, Callback callback) {
        send("PATCH", path, body, callback);
    }

    /** Runs the request on a worker thread and posts the outcome back to the UI. */
    private static void send(String method, String path, JSONObject body, Callback callback) {
        EXECUTOR.execute(() -> {
            HttpURLConnection connection = null;
            try {
                URL url = new URL(BuildConfig.API_BASE_URL + path);
                connection = (HttpURLConnection) url.openConnection();
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(15000);
                connection.setRequestProperty("Accept", "application/json");

                if ("PATCH".equals(method)) {
                    connection.setRequestMethod("POST");
                    connection.setRequestProperty("X-Http-Method-Override", "PATCH");
                } else {
                    connection.setRequestMethod(method);
                }

                if (authToken != null) {
                    connection.setRequestProperty("Authorization", "Bearer " + authToken);
                }

                if (!"GET".equals(method)) {
                    connection.setDoOutput(true);
                    connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                    byte[] payload = (body == null ? "{}" : body.toString()).getBytes(StandardCharsets.UTF_8);
                    try (OutputStream out = connection.getOutputStream()) {
                        out.write(payload);
                    }
                }

                int status = connection.getResponseCode();
                String response = readStream(status >= 400 ? connection.getErrorStream() : connection.getInputStream());

                if (status >= 200 && status < 300) {
                    MAIN.post(() -> callback.onSuccess(response));
                } else {
                    MAIN.post(() -> callback.onError(extractMessage(response, status)));
                }
            } catch (Exception ex) {
                String message = ex.getMessage() == null ? "Network error" : ex.getMessage();
                MAIN.post(() -> callback.onError(message));
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
            }
        });
    }

    /** Reads an input stream fully into a string. */
    private static String readStream(InputStream stream) throws Exception {
        if (stream == null) {
            return "";
        }
        StringBuilder builder = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line);
            }
        }
        return builder.toString();
    }

    /** Pulls the "message" field out of the API error body when one is present. */
    private static String extractMessage(String response, int status) {
        try {
            return new JSONObject(response).optString("message", "Request failed (" + status + ")");
        } catch (Exception ignored) {
            return "Request failed (" + status + ")";
        }
    }
}
