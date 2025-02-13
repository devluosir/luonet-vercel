import { Suspense } from 'react';
import { ReviewClient } from '@/components/review/ReviewClient';
import { Footer } from '@/components/Footer';

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-grow container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading...</div>}>
          <ReviewClient />
        </Suspense>
      </div>
      <Footer />
    </div>
  );
}
