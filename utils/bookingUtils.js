const generateConfirmationNumber = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };
  
  const assignBoardingPosition = (flightId, bookings) => {
    const flightBookings = bookings.filter(b => b.flightId === flightId && b.boardingPosition);
    const positionsTaken = flightBookings.map(b => {
      const [group, pos] = [b.boardingGroup, parseInt(b.boardingPosition.match(/\d+/)[0])];
      return { group, pos };
    });
  
    const groups = ['A', 'B', 'C'];
    for (const group of groups) {
      for (let pos = 1; pos <= 60; pos++) {
        if (!positionsTaken.some(p => p.group === group && p.pos === pos)) {
          return `${group}${pos}`;
        }
      }
    }
    return 'C60';
  };
  
  module.exports = { generateConfirmationNumber, assignBoardingPosition };