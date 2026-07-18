import { NextResponse } from 'next/server';

export async function POST(request) {
    const data = await request.json();
    const {nom_client, telephone, reference, commune, code_wilaya, address, montant, produit, quantite, boutique, delivery_type} = data;
    const api_token = {
      api_token: process.env.ECOTRACK_API_TOKEN
    }
    const toStr = (v) => (v ?? '').toString();
    const params = new URLSearchParams({
      reference: toStr(reference),
      nom_client: toStr(nom_client),
      telephone: toStr(telephone),
      commune: toStr(commune),
      code_wilaya: toStr(code_wilaya),
      adresse: toStr(address),
      montant: toStr(montant),
      produit: toStr(produit),
      quantite: toStr(quantite),
      type: '1',
      stock: '0',
      boutique: toStr(boutique),
      stop_desk: toStr(delivery_type),
    });
    const url = `${process.env.ECOTRACK_URL}/api/v1/create/order?${params}`;

    try {
    const response = await fetch(url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(api_token),
      },
    );
    const result = await response.json();
    if(result.errors) {
      return NextResponse.json(
        { success: false, message: "Failed to send order to delivery", error: result.message, errors: result.errors },
        { status: 400 },
      );
    }

    const internalSecret = process.env.SESSION_SECRET || process.env.ADMIN_PASS;
    fetch(`${process.env.BACKEND_URL}/api/shop/mark-order-delivery-sent/${data.order_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(internalSecret ? { 'Authorization': `Bearer ${internalSecret}` } : {}),
      },
    }).catch(e => console.error('Failed to mark order delivery_sent:', e));

    return NextResponse.json(
      { success: true, message: "Order sent to delivery successfully", result: result },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send order to delivery", error: error.message },
      { status: 500 },
    );
  }
}