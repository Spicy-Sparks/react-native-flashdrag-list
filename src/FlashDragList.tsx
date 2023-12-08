/* eslint-disable prettier/prettier */
import React, {
  FunctionComponent,
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
} from 'react';
import { LayoutChangeEvent, Platform } from 'react-native';
import { FlashList, FlashListProps } from '@shopify/flash-list';
import {
  GestureDetector,
  Gesture,
  createNativeWrapper,
  ScrollView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  runOnJS,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withTiming,
} from 'react-native-reanimated';
import ItemWrapper from './ItemWrapper';

const GestureFlashList = createNativeWrapper(FlashList);
const AnimatedFlashList = Animated.createAnimatedComponent(GestureFlashList);

type Props = Omit<FlashListProps<any>, 'renderItem'> & {
  data: Array<any>;
  itemsSize: number;
  onSort?: (fromIndex: number, toIndex: number) => any;
  renderItem: (
    item: any,
    index: number,
    active: boolean,
    beginDrag: () => any
  ) => JSX.Element;
  autoScrollSpeed?: number;
};

type Layout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const FlashDragList: FunctionComponent<Props> = (props) => {
  const { itemsSize } = props;

  const [data, setData] = useState(props.data);
  const avoidDataUpdate = useRef(false);

  const isIOS = Platform.OS === 'ios';

  useEffect(() => {
    if (avoidDataUpdate.current) return;
    setData(props.data);
  });

  const [layout, setLayout] = useState<Layout | null>(null);

  const scrollview = useRef<FlashList<any>>(null);

  const activeIndex = useSharedValue(-1);
  const [activeIndexState, setActiveIndexState] = useState(-1);
  const [active, setActive] = useState(false);
  const [callOnSort, setCallOnSort] = useState(false);
  const insertIndex = useSharedValue(-1);

  const scroll = useSharedValue(0);
  const autoScrollSpeed = useSharedValue(0);
  const autoScrollAcc = useSharedValue(1);
  const scrollInterval = useRef<NodeJS.Timeout | number | null>(null);
  const fromIndexRef = useRef<number>(-1)
  const toIndexRef = useRef<number>(-1)

  const panAbs = useSharedValue(0);
  const panScroll = useSharedValue(0);
  const panOffset = useSharedValue(0);

  const endDrag = (fromIndex: number, toIndex: number) => {
    const endAnimationDuration = 300
    panAbs.value = withTiming((toIndex * itemsSize) + (itemsSize / 2) - scroll.value, {
      duration: endAnimationDuration
    })
    setTimeout(() => {
      const changed = fromIndex !== toIndex;
      avoidDataUpdate.current = true;
      if (changed) {
        const copy = [...data];
        const removed = copy.splice(fromIndex, 1);
        copy.splice(toIndex, 0, removed[0]);
        setData(copy);
      }
      panOffset.value = 0;
      panAbs.value = -1;
      panScroll.value = 0;
      activeIndex.value = -1;
      setActiveIndexState(-1);
      insertIndex.value = -1;
      autoScrollSpeed.value = 0;
      autoScrollAcc.value = 1;
      setActive(false);
      fromIndexRef.current = fromIndex;
      toIndexRef.current = toIndex;
      if(changed) {
        setCallOnSort(true);
      }
    }, endAnimationDuration + 1)
  };
  
  useEffect(() => {
    if(!callOnSort || fromIndexRef.current < 0 || toIndexRef.current < 0)
      return
    avoidDataUpdate.current = false;
    props.onSort?.(fromIndexRef.current, toIndexRef.current);
    setCallOnSort(true);
  }, [callOnSort])

  const beginDrag = useCallback((index: number) => {
    activeIndex.value = index;
    setActiveIndexState(index);
    setActive(false);
  }, []);

  useEffect(() => {
    if (active) {
      if (!scrollInterval.current) {
        scrollInterval.current = setInterval(() => {
          if (!scrollview.current || autoScrollSpeed.value === 0) return;
          scrollview.current.scrollToOffset({
            offset:
              scroll.value +
              autoScrollSpeed.value *
                (props.autoScrollSpeed ?? 1) *
                autoScrollAcc.value,
            animated: false,
          });
          autoScrollAcc.value = Math.min(6, autoScrollAcc.value + 0.01);
        }, 16);
      }
    } else {
      if (scrollInterval.current) {
        clearInterval(scrollInterval.current);
        scrollInterval.current = null;
      }
    }
  }, [active]);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scroll.value = event.contentOffset.y;
  });

  const onLayout = useCallback((evt: LayoutChangeEvent) => {
    setLayout(evt.nativeEvent.layout);
  }, []);

  const panGesture = Gesture.Pan()
    .manualActivation(isIOS)
    .enabled(layout !== null)
    .shouldCancelWhenOutside(false)
    .onTouchesMove((_evt, stateManager) => {
      if (!isIOS) return;
      if (active || activeIndexState >= 0 || activeIndex.value >= 0)
        stateManager.activate();
      else stateManager.end();
    })
    .onBegin((evt) => {
      if (activeIndex.value >= 0) return;
      let panAbsValue = Math.max(itemsSize / 2, evt.y);
      if (layout?.height)
        panAbsValue = Math.min(layout.height - itemsSize / 2, panAbsValue);
      panAbs.value = panAbsValue;
      panScroll.value = scroll.value;
      panOffset.value = panAbs.value;
      insertIndex.value = Math.max(
        0,
        (scroll.value + panAbs.value) / itemsSize - 0.5
      );
    })
    .onUpdate((evt) => {
      if (activeIndex.value < 0) return;
      let panAbsValue = Math.max(itemsSize / 2, evt.y);
      if (layout?.height)
        panAbsValue = Math.min(layout.height - itemsSize / 2, panAbsValue);
      panAbs.value = panAbsValue;
      insertIndex.value = Math.max(
        0,
        (scroll.value + panAbs.value) / itemsSize - 0.5
      );
      if (layout) {
        if (panAbs.value >= layout.height - 100) autoScrollSpeed.value = 3;
        else if (panAbs.value < 100) autoScrollSpeed.value = -3;
        else {
          autoScrollAcc.value = 0;
          autoScrollSpeed.value = 0;
        }
      } else {
        autoScrollAcc.value = 0;
        autoScrollSpeed.value = 0;
      }
    })
    .onEnd(() => {
      if (activeIndex.value < 0) return;
      const fromIndex = activeIndex.value;
      const toIndex = Math.round(insertIndex.value);
      runOnJS(endDrag)(fromIndex, toIndex);
    });

  const extraData = useMemo(
    () => ({
      active,
    }),
    [active]
  );

  const renderItem = ({ item, index }: any) => {
    return props.renderItem(item, index, active && activeIndex.value === index, () =>
      beginDrag(index)
    );
  };

  const draggingAnimatedStyle = useAnimatedStyle(() => {
    if (activeIndex.value < 0) {
      return {
        opacity: 0,
        transform: [
          {
            translateY: 0,
          },
        ],
      };
    }
    return {
      opacity: 1,
      transform: [
        {
          translateY: panAbs.value - itemsSize / 2,
        },
      ],
    };
  }, [itemsSize]);

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        onLayout={onLayout}
        style={{
          flex: 1,
        }}
      >
        <AnimatedFlashList
          {...props}
          // @ts-ignore
          ref={scrollview}
          data={data}
          renderItem={renderItem}
          CellRendererComponent={(rowProps) => (
            <ItemWrapper
              {...rowProps}
              activeIndex={activeIndex}
              insertIndex={insertIndex}
              height={itemsSize}
              active={active}
            />
          )}
          estimatedItemSize={props.estimatedItemSize ?? itemsSize}
          scrollEnabled={(props.scrollEnabled ?? true) && !active}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          extraData={extraData}
          renderScrollComponent={ScrollView}
        />
        {active && (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: 0,
                width: '100%',
                height: itemsSize,
              },
              draggingAnimatedStyle,
            ]}
          >
            {props.renderItem(
              data[Math.max(0, activeIndexState)],
              Math.max(0, activeIndexState),
              true,
              () => {}
            )}
          </Animated.View>
        )}
      </Animated.View>
    </GestureDetector>
  );
};

export default FlashDragList;
