const { createCanvas, registerFont } = require('canvas');

registerFont('./fonts/SouthwestSans-Bold.ttf', { family: 'SouthwestSans', weight: 'bold' });
registerFont('./fonts/SouthwestSans-Regular.ttf', { family: 'SouthwestSans', weight: 'normal' });

const generateBoardingPassImage = (boardingPass) => {
  const width = 800;
  const height = 450;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const roundRect = (x, y, w, h, radius) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  const drawAirplaneIcon = (x, y, size) => {
    ctx.fillStyle = '#1e40af'; 
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.3);
    ctx.lineTo(x + size * 0.6, y);
    ctx.lineTo(x + size, y + size * 0.3);
    ctx.lineTo(x + size * 0.8, y + size * 0.5);
    ctx.lineTo(x + size, y + size * 0.7);
    ctx.lineTo(x + size * 0.6, y + size);
    ctx.lineTo(x, y + size * 0.7);
    ctx.closePath();
    ctx.fill();
  };

  const drawCalendarIcon = (x, y, size) => {
    ctx.fillStyle = '#1e40af';
    ctx.fillRect(x, y, size, size * 0.8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 2, y + size * 0.2, size - 4, size * 0.6 - 2);
    ctx.fillStyle = '#1e40af';
    ctx.fillRect(x + size * 0.2, y - size * 0.1, size * 0.2, size * 0.2);
    ctx.fillRect(x + size * 0.6, y - size * 0.1, size * 0.2, size * 0.2);
  };

  const drawWavePattern = (x, y, w, h) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    for (let i = 0; i <= w; i += 20) {
      ctx.quadraticCurveTo(i + 10, y + h - (i % 40 === 0 ? 15 : 5), i + 20, y + h);
    }
    ctx.lineTo(x + w, y);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();
  };

  const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
  bgGradient.addColorStop(0, '#e3f2fd'); 
  bgGradient.addColorStop(1, '#bbdefb');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  const headerGradient = ctx.createLinearGradient(0, 0, 0, 80);
  headerGradient.addColorStop(0, '#1e40af'); 
  headerGradient.addColorStop(1, '#3b82f6');
  ctx.fillStyle = headerGradient;
  roundRect(10, 10, width - 20, 80, 15);
  ctx.fill();
  drawWavePattern(10, 60, width - 20, 20);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px SouthwestSans';
  ctx.fillText('Southwest Airlines PTFS', 30, 40);
  ctx.font = '16px SouthwestSans';
  ctx.fillText('BOARDING PASS', 30, 65);

  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 5;
  roundRect(30, 100, width - 60, height - 40, 15);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  const leftMargin = 50;
  const lineHeight = 25;
  let currentY = 130;

  ctx.fillStyle = '#1e40af'; 
  ctx.font = 'bold 20px SouthwestSans';
  ctx.fillText(`Flight ${boardingPass.flightId}`, leftMargin, currentY);
  currentY += lineHeight;

  drawAirplaneIcon(leftMargin, currentY, 16);
  ctx.fillStyle = '#333333';
  ctx.font = '16px SouthwestSans';
  ctx.fillText(`${boardingPass.from} -> ${boardingPass.to}`, leftMargin + 30, currentY + 15);
  currentY += lineHeight;
  ctx.fillText(`Aircraft: ${boardingPass.aircraft}`, leftMargin + 30, currentY + 15);
  currentY += lineHeight;

  drawCalendarIcon(leftMargin, currentY, 16);
  ctx.fillText(`Departure: ${new Date(boardingPass.departure).toLocaleString()}`, leftMargin + 30, currentY + 15);
  currentY += lineHeight + 10;

  ctx.fillStyle = '#333333';
  ctx.font = '16px SouthwestSans';
  ctx.fillText(`Passenger: ${boardingPass.passenger}`, leftMargin, currentY);
  currentY += lineHeight;
  ctx.fillText(`Confirmation #: ${boardingPass.confirmationNumber}`, leftMargin, currentY);
  currentY += lineHeight;
  ctx.fillText(`Checked In: ${new Date(boardingPass.checkedInAt).toLocaleString()}`, leftMargin, currentY);

  const rightSectionWidth = 200;
  const rightSectionX = width - rightSectionWidth - 30;
  const rightSectionGradient = ctx.createLinearGradient(rightSectionX, 100, rightSectionX, height - 40);
  rightSectionGradient.addColorStop(0, '#1e40af'); 
  rightSectionGradient.addColorStop(1, '#2563eb');
  ctx.fillStyle = rightSectionGradient;
  roundRect(rightSectionX, 100, rightSectionWidth, height - 40, 15);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px SouthwestSans';
  ctx.textAlign = 'center';
  ctx.fillText('Boarding Position', rightSectionX + rightSectionWidth / 2, 130);

  ctx.fillStyle = '#fbbf24'; 
  ctx.font = 'bold 48px SouthwestSans';
  ctx.fillText(boardingPass.boardingPosition, rightSectionX + rightSectionWidth / 2, 190);
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(rightSectionX + rightSectionWidth / 2, 170, 40, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1.0;

  const progressBarWidth = 140;
  const progressBarX = rightSectionX + (rightSectionWidth - progressBarWidth) / 2;
  const progress = boardingPass.boardingPosition.startsWith('A') ? 0.9 : boardingPass.boardingPosition.startsWith('B') ? 0.6 : 0.3;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  roundRect(progressBarX, 210, progressBarWidth, 10, 5);
  ctx.fill();
  const progressGradient = ctx.createLinearGradient(progressBarX, 0, progressBarX + progressBarWidth, 0);
  progressGradient.addColorStop(0, '#d32f2f'); 
  progressGradient.addColorStop(1, '#fbbf24');
  ctx.fillStyle = progressGradient;
  roundRect(progressBarX, 210, progressBarWidth * progress, 10, 5);
  ctx.fill();

  const qrSize = 120;
  const qrX = rightSectionX + (rightSectionWidth - qrSize) / 2;
  const qrY = 240;
  const qrGradient = ctx.createLinearGradient(qrX, qrY, qrX + qrSize, qrY + qrSize);
  qrGradient.addColorStop(0, '#ffffff');
  qrGradient.addColorStop(0.5, '#f1f5f9');
  qrGradient.addColorStop(1, '#ffffff');
  ctx.fillStyle = qrGradient;
  roundRect(qrX, qrY, qrSize, qrSize, 10);
  ctx.fill();
  ctx.fillStyle = '#1e40af'; 
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 7; j++) {
      if (Math.random() > 0.3) {
        ctx.fillRect(qrX + 10 + i * 14, qrY + 10 + j * 14, 10, 10);
      }
    }
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px SouthwestSans';
  ctx.textAlign = 'center';
  ctx.fillText('SCAN TO BOARD', rightSectionX + rightSectionWidth / 2, qrY + qrSize + 20);
  ctx.textAlign = 'left';

  ctx.strokeStyle = '#1e40af';
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(30, 64, 175, 0.3)';
  ctx.shadowBlur = 10;
  roundRect(10, 10, width - 20, height - 20, 15);
  ctx.stroke();
  ctx.shadowBlur = 0;

  return canvas.toBuffer('image/png');
};

module.exports = { generateBoardingPassImage };