import type {Metadata} from 'next';
import {Space_Grotesk,Syne} from 'next/font/google';
import './globals.css';
const space=Space_Grotesk({variable:'--font-space',subsets:['latin']});
const syne=Syne({variable:'--font-syne',subsets:['latin']});
export const metadata:Metadata={title:'ScanEvent — Toronto, meet your people',description:'Curated social experiences, singles events, private gatherings and pop-ups in Toronto.'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body className={`${space.variable} ${syne.variable}`}>{children}</body></html>}
