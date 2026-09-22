package com.sliit.smartsolar.ui;

import android.os.Bundle;
import android.widget.EditText;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.sliit.smartsolar.R;
import com.sliit.smartsolar.data.SessionManager;
import com.sliit.smartsolar.network.ApiClient;
import com.sliit.smartsolar.util.SystemBars;

import org.json.JSONObject;

/**
 * Smart Solar Microgrid Trading System - Android Client.
 *
 * Lets a prosumer view and edit their own profile. The NIC is the primary key,
 * so it is shown but cannot be changed. The prosumer can also ask for the
 * account to be deactivated - only a Backoffice officer can switch it back on.
 */
public class ProfileActivity extends AppCompatActivity {

    private EditText nicInput;
    private EditText nameInput;
    private EditText emailInput;
    private EditText phoneInput;
    private EditText addressInput;
    private SessionManager sessionManager;
    private String userId;

    /** Binds the form and loads the current profile from the API. */
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_profile);
        SystemBars.apply(this);

        sessionManager = new SessionManager(this);
        JSONObject session = sessionManager.load();
        if (session == null) {
            finish();
            return;
        }
        userId = session.optString("userId");

        nicInput = findViewById(R.id.inputNic);
        nameInput = findViewById(R.id.inputFullName);
        emailInput = findViewById(R.id.inputEmail);
        phoneInput = findViewById(R.id.inputPhone);
        addressInput = findViewById(R.id.inputAddress);

        findViewById(R.id.buttonSave).setOnClickListener(v -> save());
        findViewById(R.id.buttonRequestDeactivation).setOnClickListener(v -> confirmDeactivation());

        loadProfile();
    }

    /** Fills the form with the profile stored on the server. */
    private void loadProfile() {
        ApiClient.get("/api/users/" + userId, new ApiClient.Callback() {
            @Override
            public void onSuccess(String body) {
                try {
                    JSONObject user = new JSONObject(body);
                    nicInput.setText(user.optString("nic"));
                    nameInput.setText(user.optString("fullName"));
                    emailInput.setText(user.optString("email"));
                    phoneInput.setText(user.isNull("phoneNumber") ? "" : user.optString("phoneNumber"));
                    addressInput.setText(user.isNull("address") ? "" : user.optString("address"));
                } catch (Exception ex) {
                    onError(ex.getMessage());
                }
            }

            @Override
            public void onError(String message) {
                Toast.makeText(ProfileActivity.this, message, Toast.LENGTH_LONG).show();
            }
        });
    }

    /** Sends the edited profile to the API. */
    private void save() {
        String name = nameInput.getText().toString().trim();
        String email = emailInput.getText().toString().trim();
        if (name.isEmpty() || email.isEmpty()) {
            Toast.makeText(this, R.string.error_fill_all_fields, Toast.LENGTH_SHORT).show();
            return;
        }

        try {
            JSONObject body = new JSONObject();
            body.put("fullName", name);
            body.put("email", email);
            body.put("phoneNumber", phoneInput.getText().toString().trim());
            body.put("address", addressInput.getText().toString().trim());

            ApiClient.put("/api/users/" + userId, body, new ApiClient.Callback() {
                @Override
                public void onSuccess(String response) {
                    sessionManager.updateFullName(name);
                    Toast.makeText(ProfileActivity.this, R.string.profile_updated, Toast.LENGTH_SHORT).show();
                    finish();
                }

                @Override
                public void onError(String message) {
                    Toast.makeText(ProfileActivity.this, message, Toast.LENGTH_LONG).show();
                }
            });
        } catch (Exception ex) {
            Toast.makeText(this, ex.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    /** Asks before sending the deactivation request. */
    private void confirmDeactivation() {
        new AlertDialog.Builder(this)
                .setTitle(R.string.request_deactivation)
                .setMessage(R.string.deactivation_confirm)
                .setPositiveButton(R.string.send_request, (dialog, which) -> requestDeactivation())
                .setNegativeButton(R.string.not_now, null)
                .show();
    }

    /** Raises the deactivation request for a Backoffice officer to action. */
    private void requestDeactivation() {
        ApiClient.patch("/api/users/" + userId + "/request-deactivation", null, new ApiClient.Callback() {
            @Override
            public void onSuccess(String body) {
                Toast.makeText(ProfileActivity.this, R.string.deactivation_requested, Toast.LENGTH_LONG).show();
            }

            @Override
            public void onError(String message) {
                Toast.makeText(ProfileActivity.this, message, Toast.LENGTH_LONG).show();
            }
        });
    }
}
