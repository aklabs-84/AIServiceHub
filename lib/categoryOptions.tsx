import {
  FaRobot,
  FaPencilAlt,
  FaChartBar,
  FaImage,
  FaCode,
  FaLanguage,
  FaGraduationCap,
  FaGamepad,
  FaBriefcase,
  FaPuzzlePiece,
  FaSmile,
  FaMagic,
  FaHeart,
} from 'react-icons/fa';

export const appIconOptions = {
  robot: FaRobot,
  pencil: FaPencilAlt,
  chart: FaChartBar,
  image: FaImage,
  code: FaCode,
  language: FaLanguage,
  graduation: FaGraduationCap,
  gamepad: FaGamepad,
  briefcase: FaBriefcase,
  puzzle: FaPuzzlePiece,
};

export const promptIconOptions = {
  smile: FaSmile,
  briefcase: FaBriefcase,
  magic: FaMagic,
  heart: FaHeart,
  graduation: FaGraduationCap,
  image: FaImage,
};

export const appCategoryDefaults = [
  { value: 'chatbot', label: '챗봇', icon: 'robot', color: 'bg-blue-500' },
  { value: 'content-generation', label: '콘텐츠 생성', icon: 'pencil', color: 'bg-purple-500' },
  { value: 'education', label: '교육', icon: 'graduation', color: 'bg-red-500' },
  { value: 'game', label: '게임', icon: 'gamepad', color: 'bg-orange-500' },
  { value: 'productivity', label: '생산성', icon: 'briefcase', color: 'bg-teal-500' },
  { value: 'other', label: '유틸', icon: 'puzzle', color: 'bg-gray-500' },
];

export const promptCategoryDefaults = [
  { value: 'daily', label: '일상', icon: 'smile', color: 'bg-emerald-500' },
  { value: 'work', label: '업무', icon: 'briefcase', color: 'bg-blue-500' },
  { value: 'fun', label: '재미', icon: 'magic', color: 'bg-purple-500' },
  { value: 'image', label: '이미지', icon: 'image', color: 'bg-pink-500' },
  { value: 'education', label: '교육', icon: 'graduation', color: 'bg-orange-500' },
  { value: 'web-application', label: '웹앱', icon: 'magic', color: 'bg-cyan-500' },
];

export const appColorOptions = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-green-500',
  'bg-pink-500',
  'bg-yellow-500',
  'bg-indigo-500',
  'bg-red-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-gray-500',
];

export const promptColorOptions = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-orange-500',
  'bg-gray-500',
];
