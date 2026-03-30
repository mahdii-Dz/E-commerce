import { NextResponse } from 'next/server';

export async function POST(request,{ params }) {
    const data = await request.json();
    const {nom_client, telephone, commune, code_wilaya,address,montant, produit, quantite, boutique, delivery_type} = data;
    const api_token = {
      api_token: process.env.ECOTRACK_API_TOKEN
    }
    const url = `${process.env.ECOTRACK_URL}/api/v1/create/order?reference&nom_client=${nom_client}&telephone=${telephone}&commune=${commune}&code_wilaya=${code_wilaya}&adresse=${address}&montant=${montant}&produit=${produit}&quantite=${quantite}&type=1&stock=0&boutique=${boutique}&stop_desk=${delivery_type}`;
    
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
        { success: false, message: "Failed to send order to delivery", error: result.message },
        { status: 400 },
      );
    }

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