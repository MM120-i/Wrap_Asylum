export const Header = () => {
  return (
    <box justifyContent="center" alignItems="center">
      <box
        flexDirection="row"
        justifyContent="center"
        gap={0.5}
        alignItems="center"
      >
        <ascii-font font="tiny" text="Warp" color="gray" />
        <ascii-font font="tiny" text="Asylum" />
      </box>
    </box>
  );
};
