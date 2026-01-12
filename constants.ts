
import { Cultivar } from './types';

export const BANANA_CULTIVARS: Cultivar[] = [
  { id: '01', name: 'Musa acuminata', category: 'Category:Musa_acuminata_cultivars', order: 1, description: 'Wild ancestor (A genome)' },
  { id: '02', name: 'Musa balbisiana', category: 'Category:Musa_balbisiana', order: 2, description: 'Wild ancestor (B genome)' },
  { id: '03', name: 'Gros Michel', category: 'Category:Gros_Michel_bananas', order: 3, description: 'The historic commercial standard before Panama disease.' },
  { id: '04', name: 'Cavendish', category: 'Category:Cavendish_bananas', order: 4, description: 'The dominant modern commercial group.' },
  { id: '05', name: 'Lady Finger', category: 'Category:Lady_Finger_bananas', order: 5, description: 'Thin-skinned, sweet diploid cultivars.' },
  { id: '06', name: 'Lakatan', category: 'Category:Lakatan_banana', order: 6, description: 'Popular Philippine dessert banana.' },
  { id: '07', name: 'Latundan', category: 'Category:Latundan_banana', order: 7, description: 'Common silk banana from Southeast Asia.' },
  { id: '08', name: 'Señorita', category: 'Category:Señorita_banana', order: 8, description: 'Tiny, extra-sweet tropical specialty.' },
  { id: '09', name: 'Saba', category: 'Category:Saba_banana', order: 9, description: 'Starchy cooking banana, critical for food security.' },
  { id: '10', name: 'Cardava', category: 'Category:Cardava_banana', order: 10, description: 'Similar to Saba, robust triploid.' },
  { id: '11', name: 'Red Banana', category: 'Category:Red_bananas', order: 11, description: 'Distinctive color and creamy texture.' },
  { id: '12', name: 'Blue Java', category: 'Category:Blue_Java_banana', order: 12, description: 'Ice cream banana with vanilla-like flavor.' }
];

export const WIKIMEDIA_API = "https://commons.wikimedia.org/w/api.php";
