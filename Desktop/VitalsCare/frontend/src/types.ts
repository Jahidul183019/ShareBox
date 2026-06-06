export type ViewType = 'landing' | 'dashboard' | 'assess' | 'chat' | 'profile';

export interface AssessmentData {
  age: number;
  systolic: number;
  diastolic: number;
  height: number; // in cm
  weight: number; // in kg
  activityLevel: 'low' | 'medium' | 'high';
  familyHistory: {
    diabetes: boolean;
    hypertension: boolean;
    stroke: boolean;
    heartDisease: boolean;
  };
  dietQuality: 'poor' | 'average' | 'good';
  saltIntake: 'low' | 'medium' | 'high';
  stressLevel: 'low' | 'medium' | 'high';
  smoking: boolean;
  gender: 'male' | 'female' | 'other';
  fastingBloodSugar: 'normal' | 'borderline' | 'high';
  cholesterol: 'normal' | 'high' | 'unsure';
  sleepDuration: 'optimal' | 'insufficient';
  alcohol: 'never' | 'occasional' | 'regular';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface Clinic {
  name: string;
  distance: string;
  hours: string;
  phone: string;
  address: string;
  coordinates: { lat: number; lng: number };
}

export interface Article {
  id: string;
  type: 'ARTICLE' | 'COMMUNITY';
  time: string;
  title: string;
  summary: string;
  content: string;
}
