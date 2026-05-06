import { DBSpecial, DBunit } from "../DBLoader"

describe('Stacking logic tests', () => {

  const saboSpecial = DBSpecial[1028];

  it('Sabo (1028) should provide 1.75x boost after 30 hits if NO atk boost is active', () => {
    const mockParams = {
        slot: 0,
        scope: {
            hasAtkBoostActive: jest.fn().mockReturnValue(false)
        }
    };

    // Before 30 hits
    expect(saboSpecial.hit(30, mockParams)).toBe(1);
    
    // After 30 hits
    expect(saboSpecial.hit(31, mockParams)).toBe(1.75);
    expect(mockParams.scope.hasAtkBoostActive).toHaveBeenCalledWith(0);
  });

  it('Sabo (1028) should provide 1x boost (no boost) even after 30 hits if an atk boost IS active', () => {
    const mockParams = {
        slot: 2,
        scope: {
            hasAtkBoostActive: jest.fn().mockReturnValue(true)
        }
    };

    // After 30 hits, but with active boost
    expect(saboSpecial.hit(31, mockParams)).toBe(1);
    expect(mockParams.scope.hasAtkBoostActive).toHaveBeenCalledWith(2);
  });

  it('ID 2380 should provide 2.25x boost after 12 hits for Driven units if NO atk boost is active', () => {
    const special2380 = DBSpecial[2380];
    const mockParams = {
        slot: 0,
        unit: {
            class: {
                has: (c) => c === "Driven"
            }
        },
        scope: {
            hasAtkBoostActive: jest.fn().mockReturnValue(false)
        }
    };

    // After 12 hits
    expect(special2380.hit(13, mockParams)).toBe(2.25);
  });

  it('ID 2380 should NOT provide boost if an atk boost IS active', () => {
    const special2380 = DBSpecial[2380];
    const mockParams = {
        slot: 0,
        unit: {
            class: {
                has: (c) => c === "Driven"
            }
        },
        scope: {
            hasAtkBoostActive: jest.fn().mockReturnValue(true)
        }
    };

    // After 12 hits, but with active boost
    expect(special2380.hit(13, mockParams)).toBe(1);
  });
});
