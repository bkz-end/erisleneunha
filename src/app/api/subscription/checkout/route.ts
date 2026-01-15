import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

// Configurações do Mercado Pago
const MERCADO_PAGO_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Preço da assinatura
const SUBSCRIPTION_PRICE = 30.0;

export async function POST(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (auth) {
      return auth;
    }

    if (!MERCADO_PAGO_ACCESS_TOKEN || MERCADO_PAGO_ACCESS_TOKEN === "your_mercado_pago_access_token") {
      // Modo de desenvolvimento - retorna URL fake
      console.log("Mercado Pago não configurado, usando modo de teste");
      return NextResponse.json({ 
        checkoutUrl: `${APP_URL}/admin/configuracoes?payment=pending`,
        message: "Mercado Pago não configurado. Configure MERCADO_PAGO_ACCESS_TOKEN no .env.local"
      });
    }

    // Criar preferência de pagamento no Mercado Pago
    const preference = {
      items: [
        {
          title: "Assinatura Mensal - Sistema de Agendamento",
          quantity: 1,
          unit_price: SUBSCRIPTION_PRICE,
          currency_id: "BRL",
        },
      ],
      back_urls: {
        success: `${APP_URL}/admin/configuracoes?payment=success`,
        failure: `${APP_URL}/admin/configuracoes?payment=failure`,
        pending: `${APP_URL}/admin/configuracoes?payment=pending`,
      },
      auto_return: "approved",
      notification_url: `${APP_URL}/api/webhooks/mercadopago`,
      external_reference: `subscription_${Date.now()}`,
    };

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Mercado Pago error:", error);
      throw new Error("Erro ao criar checkout");
    }

    const data = await response.json();
    
    return NextResponse.json({ 
      checkoutUrl: data.init_point,
      preferenceId: data.id 
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Erro ao processar pagamento" },
      { status: 500 }
    );
  }
}
