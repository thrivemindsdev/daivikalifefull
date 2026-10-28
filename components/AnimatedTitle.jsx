import React from 'react';
import { motion } from 'framer-motion';

const AnimatedTitle = ({ 
  text, 
  style = {}, 
  delay = 0.1, 
  className = "",
  color = "inherit",
  fontSize = "inherit",
  fontWeight = "inherit",
  as: Component = "div"
}) => {
  const lines = Array.isArray(text) ? text : [text];

  return (
    <Component 
      className={className} 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        color, 
        fontSize, 
        fontWeight,
        lineHeight: 1.1,
        margin: 0, // Reset browser default header margins to protect design layout
        ...style 
      }}
    >
      {lines.map((line, index) => (
        <div key={index} style={{ overflow: 'hidden' }}>
          <motion.div
            initial={{ y: '100%' }}
            whileInView={{ y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: delay + (index * 0.15) }}
          >
            {line}
          </motion.div>
        </div>
      ))}
    </Component>
  );
};

export default AnimatedTitle;
