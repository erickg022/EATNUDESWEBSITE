// api/subscribe.js — Función serverless (formato Vercel).
// Recibe el formulario y crea/actualiza el contacto en Brevo (single opt-in).
// El correo de bienvenida lo envía una automatización de Brevo
// (disparador: "contacto añadido a la lista Registro web").
//
// Variables de entorno (se configuran en Vercel, NUNCA en el código):
//   BREVO_API_KEY   → API key de la cuenta de Brevo
//   BREVO_LIST_ID   → ID numérico de la lista "Registro web"

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });

  const { nombre, email, ciudad, codigoPostal, fechaNacimiento, consentimiento, empresa } = req.body || {};

  // Bot: rellenó el campo trampa. Respondemos OK sin hacer nada.
  if (empresa) return res.status(200).json({ ok: true });

  const emailLimpio = String(email || '').trim().toLowerCase();
  if (!nombre || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)) {
    return res.status(400).json({ error: 'Faltan el nombre o un correo válido.' });
  }
  if (!consentimiento) return res.status(400).json({ error: 'Falta el consentimiento.' });

  // Solo se envían a Brevo los atributos que tienen valor
  const attributes = { FIRSTNAME: String(nombre).trim().slice(0, 80) };
  if (ciudad) attributes.CIUDAD = String(ciudad).trim().slice(0, 80);
  if (codigoPostal) attributes.CODIGO_POSTAL = String(codigoPostal).trim().slice(0, 12);
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento || '')) attributes.FECHA_NACIMIENTO = fechaNacimiento;

  try {
    const r = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        accept: 'application/json'
      },
      body: JSON.stringify({
        email: emailLimpio,
        attributes,
        listIds: [Number(process.env.BREVO_LIST_ID)],
        updateEnabled: true // si ya existe, actualiza sus datos en vez de fallar
      })
    });

    // 201 = creado, 204 = actualizado
    if (r.ok) return res.status(200).json({ ok: true });

    const detalle = await r.text();
    console.error('Brevo error', r.status, detalle);
    return res.status(502).json({ error: 'No se pudo completar el registro.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'No se pudo completar el registro.' });
  }
}
