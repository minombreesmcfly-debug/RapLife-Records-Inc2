import React from 'react';
import SponsoredCarousel from '../components/SponsoredCarousel';
import SpotifyTurntable from '../components/SpotifyTurntable';
import IntroVideo from '../components/IntroVideo';
import PhotoSlides from '../components/PhotoSlides';
import { Sparkles, Radio, Mic2 } from 'lucide-react';

const HomeView: React.FC = () => {
  return (
    <div className="space-y-12 md:space-y-16 px-4 md:px-8 max-w-7xl mx-auto">
      {/* SPONSORED ARTISTS CAROUSEL / SLIDES */}
      <section className="w-full">
        <SponsoredCarousel />
      </section>

      {/* VINYL TURNTABLE & RADIO STREAMING */}
      <section className="w-full">
        <SpotifyTurntable />
      </section>

      {/* PHOTO SLIDES & INTRO VIDEO GRID */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-6">
          <PhotoSlides />
        </div>
        <div className="lg:col-span-6">
          <IntroVideo />
        </div>
      </section>
    </div>
  );
};

export default HomeView;
