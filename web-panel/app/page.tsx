import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white">
      
      <Image 
        src="/logo.jpg" 
        alt="Fırsat Logo" 
        width={250} 
        height={250} 
      />
      
      <h1 className="mt-8 text-4xl font-bold text-orange-600">
        Fırsat 23 Çok Yakında!
      </h1>
      
    </div>
  );
}