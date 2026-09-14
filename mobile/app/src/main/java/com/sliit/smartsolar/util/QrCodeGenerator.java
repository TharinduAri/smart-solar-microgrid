package com.sliit.smartsolar.util;

import android.graphics.Bitmap;
import android.graphics.Color;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;

import org.json.JSONObject;

/**
 * Smart Solar Microgrid Trading System - Android Client.
 *
 * Builds the transaction QR code a prosumer presents at the microgrid node. The
 * payload only carries the reservation id and the server issued token, so the
 * Grid Operator app still has to verify it against the Web API before the energy
 * transfer can be finalised.
 */
public final class QrCodeGenerator {

    private static final int SIZE = 600;

    private QrCodeGenerator() {
    }

    /** Encodes the reservation id and token as a scannable QR bitmap. */
    public static Bitmap createTransactionQr(String reservationId, String qrToken) throws Exception {
        JSONObject payload = new JSONObject();
        payload.put("reservationId", reservationId);
        payload.put("qrToken", qrToken);

        BitMatrix matrix = new QRCodeWriter().encode(payload.toString(), BarcodeFormat.QR_CODE, SIZE, SIZE);
        Bitmap bitmap = Bitmap.createBitmap(SIZE, SIZE, Bitmap.Config.RGB_565);

        for (int x = 0; x < SIZE; x++) {
            for (int y = 0; y < SIZE; y++) {
                bitmap.setPixel(x, y, matrix.get(x, y) ? Color.BLACK : Color.WHITE);
            }
        }
        return bitmap;
    }
}
