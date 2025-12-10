import { useState } from 'react';

// Mock name data for different genres and genders
const NAME_DATA = {
  fantasy: {
    male: [
      'Zelphar, Void Walker',
      'Kaelen, Stormbringer',
      'Thranduil, Forest Guardian',
      'Draxus, Iron Warrior',
      'Lirael, Shadow Mage',
      'Gareth, Dragon Rider',
      'Faelan, Star Seer',
      'Mordecai, Blood Hunter',
      'Aelar, Elven Prince',
      'Bjorn, Mountain Barbarian'
    ],
    female: [
      'Seraphina, Light Weaver',
      'Lyra, Moon Priestess',
      'Eowyn, Shield Maiden',
      'Morganna, Dark Sorceress',
      'Aria, Song of the Wind',
      'Elowen, Nature Whisperer',
      'Vesper, Night Dancer',
      'Liora, Sun Guardian',
      'Thalia, Blade Dancer',
      'Rowena, Alchemist Queen'
    ],
    neutral: [
      'Ryn, Wanderer of Realms',
      'Kai, Balance Keeper',
      'Soren, Eternal Guardian',
      'Nova, Star Forged',
      'Echo, Voice of the Abyss',
      'Valor, Steel Heart',
      'Aurora, Dawn Bringer',
      'Nyx, Shadow Stalker',
      'Sol, Sun Chaser',
      'Luna, Moon Child'
    ]
  },
  sciFi: {
    male: [
      'Jaxon Ryn, Cyborg Commander',
      'Kael Voss, Interstellar Pilot',
      'Darius Thorn, Quantum Engineer',
      'Ryker Blade, Space Pirate',
      'Eliot Nash, AI Specialist',
      'Marcus Orion, Planetary Governor',
      'Kairos Zen, Time Agent',
      'Zane Nova, Stellar Ranger',
      'Talon Black, Mercenary Captain',
      'Orion Forge, Ship Builder'
    ],
    female: [
      'Astra Vex, Cyber Hacker',
      'Lira Nova, Alien Diplomat',
      'Nova Rayne, Star Fighter Pilot',
      'Maya Cipher, Cryptographer',
      'Eclipse Nightshade, Spy',
      'Seraphina Echo, Android Assassin',
      'Zara Phoenix, Colony Commander',
      'Lyra Stardust, Astrobiologist',
      'Vesper Shadow, Stealth Operative',
      'Aria Quantum, Reality Architect'
    ],
    neutral: [
      'Cipher Zero, Synthetic Intelligence',
      'Ryn Nexus, Dimension Walker',
      'Nova Eclipse, Cosmic Voyager',
      'Kai Starborn, Energy Manipulator',
      'Echo Void, Signal Interceptor',
      'Sol Eclipse, Solar Engineer',
      'Luna Vector, Navigation Expert',
      'Orion Pulse, Communications Officer',
      'Aurora Drift, Gravitational Physicist',
      'Nyx Circuit, System Administrator'
    ]
  },
  modern: {
    male: [
      'Ethan Carter, Private Investigator',
      'Liam Thompson, Emergency Doctor',
      'Noah Bennett, Tech Entrepreneur',
      'Mason Reed, Professional Athlete',
      'Caleb Brooks, Award-Winning Author',
      'Lucas Morgan, Celebrity Chef',
      'Owen Taylor, Military Veteran',
      'Gabriel Martinez, Architect',
      'Benjamin Wright, Lawyer',
      'Daniel Harris, Photojournalist'
    ],
    female: [
      'Olivia Parker, FBI Agent',
      'Emma Wilson, Fashion Designer',
      'Ava Johnson, Neuroscientist',
      'Sophia Davis, Human Rights Lawyer',
      'Isabella Martinez, Acclaimed Actress',
      'Charlotte Lee, Environmental Activist',
      'Mia Thompson, Professional Dancer',
      'Amelia Rodriguez, Astronaut Candidate',
      'Harper Chen, Tech CEO',
      'Evelyn Brown, Bestselling Author'
    ],
    neutral: [
      'Jordan Taylor, Freelance Journalist',
      'Riley Morgan, Social Media Influencer',
      'Quinn Wilson, Graphic Designer',
      'Casey Lee, Music Producer',
      'Avery Martinez, Event Planner',
      'Parker Davis, Professional Photographer',
      'Hayden Brown, Fitness Coach',
      'Alex Chen, Interior Designer',
      'Taylor Wright, Personal Trainer',
      'Jamie Johnson, Video Game Developer'
    ]
  }
};

type Genre = 'fantasy' | 'sciFi' | 'modern';
type Gender = 'male' | 'female' | 'neutral';

interface CharacterNameGenProps {
  className?: string;
}

export default function CharacterNameGen({ className = '' }: CharacterNameGenProps) {
  const [genre, setGenre] = useState<Genre>('fantasy');
  const [gender, setGender] = useState<Gender>('neutral');
  const [generatedName, setGeneratedName] = useState<string>('');

  const handleGenerate = () => {
    const names = NAME_DATA[genre][gender];
    const randomName = names[Math.floor(Math.random() * names.length)];
    setGeneratedName(randomName);
  };

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      <div className="bg-white rounded-3xl shadow-lg p-8 border border-slate-200">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
          Fantasy Character Name Generator
        </h2>
        
        {/* Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Genre
            </label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value as Genre)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              <option value="fantasy">Fantasy</option>
              <option value="sciFi">Science Fiction</option>
              <option value="modern">Modern</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Gender
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
        </div>
        
        {/* Generate Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={handleGenerate}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
          >
            🪄 Generate Name
          </button>
        </div>
        
        {/* Output Section */}
        {generatedName && (
          <div className="text-center">
            <h3 className="text-lg font-semibold text-slate-600 mb-3">
              Your Character Name
            </h3>
            <div className="bg-gradient-to-r from-indigo-100 to-purple-100 rounded-2xl p-6 border border-indigo-200">
              <p className="text-2xl md:text-3xl font-bold text-slate-800">
                {generatedName}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
