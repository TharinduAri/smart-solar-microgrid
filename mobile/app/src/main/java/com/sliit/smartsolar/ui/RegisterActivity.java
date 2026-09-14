package com.sliit.smartsolar.ui;

import android.os.Bundle;
import android.widget.EditText;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.sliit.smartsolar.R;
import com.sliit.smartsolar.network.ApiClient;

import org.json.JSONObject;

/**
 * Smart Solar Microgrid Trading System - Android Client.
 *
 * Prosumer self-registration. The National Identity Card number is the primary
 * key of the account, and the new account stays inactive until a Backoffice
 * officer approves it from the web application.
 */
public class RegisterActivity extends AppCompatActivity {

    private EditText nicInput;
    private EditText nameInput;
    private EditText emailInput;
    private EditText phoneInput;
    private EditText addressInput;
    private EditText passwordInput;

    /** Binds the registration form fields. */
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_register);

        nicInput = findViewById(R.id.inputNic);
        nameInput = findViewById(R.id.inputFullName);
        emailInput = findViewById(R.id.inputEmail);
        phoneInput = findViewById(R.id.inputPhone);
        addressInput = findViewById(R.id.inputAddress);
        passwordInput = findViewById(R.id.inputPassword);

        findViewById(R.id.buttonRegister).setOnClickListener(v -> register());
    }

    /** Sends the registration to /api/auth/register and returns to the login screen. */
    private void register() {
        if (nicInput.getText().toString().trim().isEmpty()
                || nameInput.getText().toString().trim().isEmpty()
                || passwordInput.getText().toString().isEmpty()) {
            Toast.makeText(this, R.string.error_fill_all_fields, Toast.LENGTH_SHORT).show();
            return;
        }

        try {
            JSONObject body = new JSONObject();
            body.put("nic", nicInput.getText().toString().trim());
            body.put("fullName", nameInput.getText().toString().trim());
            body.put("email", emailInput.getText().toString().trim());
            body.put("phoneNumber", phoneInput.getText().toString().trim());
            body.put("address", addressInput.getText().toString().trim());
            body.put("password", passwordInput.getText().toString());

            ApiClient.post("/api/auth/register", body, new ApiClient.Callback() {
                @Override
                public void onSuccess(String response) {
                    Toast.makeText(RegisterActivity.this, R.string.registration_pending, Toast.LENGTH_LONG).show();
                    finish();
                }

                @Override
                public void onError(String message) {
                    Toast.makeText(RegisterActivity.this, message, Toast.LENGTH_LONG).show();
                }
            });
        } catch (Exception ex) {
            Toast.makeText(this, ex.getMessage(), Toast.LENGTH_LONG).show();
        }
    }
}
