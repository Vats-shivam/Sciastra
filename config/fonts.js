// config/fonts.js
// Gilroy font family configuration
export default {
  // Font weights
  regular: 'Gilroy-Regular',
  medium: 'Gilroy-Medium',
  semiBold: 'Gilroy-SemiBold',
  bold: 'Gilroy-Bold',
  light: 'Gilroy-Light',
  thin: 'Gilroy-Thin',
  ultraLight: 'Gilroy-UltraLight',
  extraBold: 'Gilroy-ExtraBold',
  heavy: 'Gilroy-Heavy',
  black: 'Gilroy-Black',
  
  // Helper function to get font based on fontWeight
  getFont: (weight = 'regular') => {
    const weightMap = {
      '100': 'Gilroy-Thin',
      '200': 'Gilroy-UltraLight',
      '300': 'Gilroy-Light',
      '400': 'Gilroy-Regular',
      '500': 'Gilroy-Medium',
      '600': 'Gilroy-SemiBold',
      '700': 'Gilroy-Bold',
      '800': 'Gilroy-ExtraBold',
      '900': 'Gilroy-Heavy',
      'normal': 'Gilroy-Regular',
      'bold': 'Gilroy-Bold',
    };
    
    return weightMap[weight] || 'Gilroy-Regular';
  },
};

