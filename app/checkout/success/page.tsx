import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export default function CheckoutSuccessPage() {
  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#0b0b0c',padding:24}}>
    <section style={{maxWidth:560,background:'#f0efe9',color:'#111',padding:48,textAlign:'center'}}>
      <CheckCircle2 size={54} color="#527000" />
      <h1 style={{fontFamily:'var(--font-syne)',fontSize:42,letterSpacing:-2}}>Ödemeniz alındı.</h1>
      <p style={{lineHeight:1.7,color:'#666'}}>Biletleriniz birkaç dakika içinde ödeme sırasında verdiğiniz e-posta adresine gönderilecek. Spam klasörünü de kontrol edin.</p>
      <Link href="/" style={{display:'inline-block',marginTop:20,background:'#d9ff3f',padding:'14px 20px',fontWeight:700,textDecoration:'none'}}>Etkinliklere dön</Link>
    </section>
  </main>;
}

