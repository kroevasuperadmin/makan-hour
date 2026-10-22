import React from 'react';
import { Image, ImageSourcePropType, View } from 'react-native';
import { color } from '@makan/ui';

// Unsplash License. The masthead is credited on the sign-in screen.
// The squares are seeded stand-ins for the three preview kitchens and their nine dishes.
// r1 Vernon Raineil Cenzon · r2 Anh Vy · r3 Joshua Rawson-Harris
// i-ayam Takashi Miyazaki · i-lemak Kevin · i-kandar Ludo Poiré · i-mee Kevin
// i-roti Mufid Majnun · i-teh Joanna Kosinska · i-wantan Yusheng Deng
// i-horfun Louis Hansel · i-veg Iosi Pratama
export const LUNCH: ImageSourcePropType = require('../assets/photos/lunch.jpg');
export const LUNCH_CREDIT = 'Photograph by Aldrin Rachman Pradana.';
export const LUNCH_LABEL = 'Nasi lemak on a white plate, with egg, peanuts and cucumber. Photograph by Aldrin Rachman Pradana.';

const restaurants: Record<string, ImageSourcePropType> = {
  r1: require('../assets/photos/r1.jpg'),
  r2: require('../assets/photos/r2.jpg'),
  r3: require('../assets/photos/r3.jpg'),
};

const dishes: Record<string, ImageSourcePropType> = {
  'i-ayam': require('../assets/photos/i-ayam.jpg'),
  'i-lemak': require('../assets/photos/i-lemak.jpg'),
  'i-kandar': require('../assets/photos/i-kandar.jpg'),
  'i-mee': require('../assets/photos/i-mee.jpg'),
  'i-roti': require('../assets/photos/i-roti.jpg'),
  'i-teh': require('../assets/photos/i-teh.jpg'),
  'i-wantan': require('../assets/photos/i-wantan.jpg'),
  'i-horfun': require('../assets/photos/i-horfun.jpg'),
  'i-veg': require('../assets/photos/i-veg.jpg'),
};

export const restaurantPhoto = (id: string) => restaurants[id];
export const dishPhoto = (id: string) => dishes[id];

// Flat square. No frame, no shadow. 4px corner matches the one radius.
export function Thumb({ source, label }: { source?: ImageSourcePropType; label: string }) {
  if (!source) return <View style={{ width: 56, height: 56, borderRadius: 4, backgroundColor: color.sunk }} />;
  return (
    <View style={{ width: 56, height: 56, borderRadius: 4, overflow: 'hidden' }}>
      <Image source={source} accessibilityLabel={label} style={{ width: 56, height: 56 }} resizeMode="cover" />
    </View>
  );
}
