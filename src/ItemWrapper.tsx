import React, { forwardRef, PropsWithChildren } from 'react'
import { ViewStyle } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring, useAnimatedReaction } from 'react-native-reanimated'
import { CellContainer } from '@shopify/flash-list'

const AnimatedCellContainer = Animated.createAnimatedComponent(CellContainer)

type Props = PropsWithChildren<{
  index: number,
  activeIndex: Animated.SharedValue<number>,
  insertIndex: Animated.SharedValue<number>,
  height: number,
  pan: Animated.SharedValue<number>,
  style?: ViewStyle
}>

const ItemWrapper = forwardRef<any, Props>((props, ref) => {
  const {
    pan,
    height,
    insertIndex,
    activeIndex,
    index
  } = props

  const position = useSharedValue(0)

  const animatedStyleWrapper = useAnimatedStyle(() => {
    if(activeIndex.value === index) {
      return {
        elevation: 1,
        zIndex: 999999
      }
    }
    return {
      elevation: 0,
      zIndex: 0
    }
  }, [activeIndex, index])

  useAnimatedReaction(() => {
    return insertIndex.value
  }, (newInsertIndex) => {
    if(newInsertIndex < 0 || activeIndex.value < 0) {
      position.value = withSpring(0)
      return
    }
    else if(index > activeIndex.value && index <= newInsertIndex + 0.5) {
      position.value = withSpring(-height)
      return
    }
    else if(index < activeIndex.value && index >= newInsertIndex - 0.5) {
      position.value = withSpring(height)
      return
    }
    else {
      position.value = withSpring(0)
      return
    }
  }, [index, height])

  const animatedStyle = useAnimatedStyle(() => {
    if(activeIndex.value === index) {
      return {
        transform: [{
          translateY: pan.value
        }]
      }
    }
    return {
      transform: [{
        translateY: position.value
      }]
    }
  }, [])

  return (
    <AnimatedCellContainer
      ref={ref}
      {...props}
      style={[props.style, animatedStyleWrapper]}
    >
      <Animated.View style={animatedStyle}>
        { props.children }
      </Animated.View>
    </AnimatedCellContainer>
  )
})

export default ItemWrapper