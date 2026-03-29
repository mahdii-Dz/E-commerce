import { NextResponse } from 'next/server';
export async function POST(request,{ params }) {
    const data = await request.body();
    const {nom_client, telephone, commune, code_wilaya,address,montant, produit, quantite, boutique, delivery_type} = data;
    const api_token = process.env.ECOTRACK_API_TOKEN;
    console.log('name:', nom_client,'telephone:',telephone,'commune:',commune,'code_wilaya:',code_wilaya,'address:',address,'montant:',montant,'produit:',produit,'quantite:',quantite,'boutique:',boutique,'delivery_type:',delivery_type);
    return NextResponse.json(
      { success: true, message: 'Order sent to delivery successfully' },
      { status: 200 }
    );
    // try{
    //     const response = await fetch(`${process.env.ECOTRACK_URL}/api/v1/create/order?reference&nom_client=${nom_client}&telephone=${telephone}&commune=${commune}&code_wilaya=${code_wilaya}&address=${address}&montant=${montant}&produit${produit}&quantite${quantite}&type=1&stock=0&boutique=${boutique}&${delivery_type}`, {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json',
    //         },
    //         body: JSON.stringify(api_token)
    //     });
    //     const result = await response.json();
    //     return new Response(JSON.stringify(result), {
    //         headers: {
    //             'Content-Type': 'application/json'
    //         }
    //     });
    // } catch (error) {
    //     console.error('Error:', error);
    //     return new Response(JSON.stringify({ error: 'Failed to track shipment' }), {
    //         status: 500,
    //         headers: {
    //             'Content-Type': 'application/json'
    //         }
    //     });

    // }
}