package com.sliit.smartsolar.ui;

import android.content.Intent;
import android.os.Bundle;
import android.widget.EditText;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.sliit.smartsolar.R;
import com.sliit.smartsolar.data.SessionManager;
import com.sliit.smartsolar.network.ApiClient;

import org.json.JSONObject;

/**
 * Smart Solar Microgrid Trading System - Android Client.
 *
 * Launcher screen. Signs the user in through the Web API and routes them to the
 * prosumer home or the grid operator home depending on the role in the response.
 */
public class LoginActivity extends AppCompatActivity {

    private EditText usernameInput;
    private EditText passwordInput;
    private SessionManager sessionManager;

    /** Wires up the screen and skips straight to the home screen if already signed in. */
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        sessionManager = new SessionManager(this);
        usernameInput = findViewById(R.id.inputUsername);
        passwordInput = findViewById(R.id.inputPassword);

        JSONObject saved = sessionManager.load();
        if (saved != null) {
            openHome(saved.optString("role"));
            return;
        }

        findViewById(R.id.buttonLogin).setOnClickListener(v -> login());
        findViewById(R.id.linkRegister).setOnClickListener(
                v -> startActivity(new Intent(this, RegisterActivity.class)));
    }

    /** Posts the credentials to /api/auth/login and stores the session in SQLite. */
    private void login() {
        String username = usernameInput.getText().toString().trim();
        String password = passwordInput.getText().toString();

        if (username.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, R.string.error_fill_all_fields, Toast.LENGTH_SHORT).show();
            return;
        }

        try {
            JSONObject body = new JSONObject();
            body.put("username", username);
            body.put("password", password);

            ApiClient.post("/api/auth/login", body, new ApiClient.Callback() {
                @Override
                public void onSuccess(String response) {
                    try {
                        JSONObject result = new JSONObject(response);
                        sessionManager.save(result);
                        openHome(result.optString("role"));
                    } catch (Exception ex) {
                        onError(ex.getMessage());
                    }
                }

                @Override
                public void onError(String message) {
                    Toast.makeText(LoginActivity.this, message, Toast.LENGTH_LONG).show();
                }
            });
        } catch (Exception ex) {
            Toast.makeText(this, ex.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    /** Sends the user to the home screen that matches their role. */
    private void openHome(String role) {
        Class<?> target = "Prosumer".equals(role) ? ProsumerHomeActivity.class : OperatorHomeActivity.class;
        startActivity(new Intent(this, target));
        finish();
    }
}
